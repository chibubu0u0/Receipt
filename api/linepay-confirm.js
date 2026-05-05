import crypto from "crypto";

const LINE_PAY_SANDBOX_BASE_URL = "https://sandbox-api-pay.line.me";

function getLinePayConfig() {
  const channelId = process.env.LINE_PAY_CHANNEL_ID;
  const channelSecret = process.env.LINE_PAY_CHANNEL_SECRET;
  const baseUrl = process.env.LINE_PAY_API_BASE_URL || LINE_PAY_SANDBOX_BASE_URL;

  if (!channelId || !channelSecret) {
    const error = new Error("尚未設定 LINE_PAY_CHANNEL_ID 或 LINE_PAY_CHANNEL_SECRET。");
    error.statusCode = 500;
    throw error;
  }

  return { channelId, channelSecret, baseUrl };
}

function signLinePay(channelSecret, apiPath, body, nonce) {
  const message = channelSecret + apiPath + JSON.stringify(body) + nonce;

  return crypto
    .createHmac("sha256", channelSecret)
    .update(message)
    .digest("base64");
}

function parseLinePayResponse(text) {
  const processed = text.replace(/:\s*(\d{16,})\b/g, ': "$1"');
  return JSON.parse(processed);
}

async function callLinePayPost(apiPath, body) {
  const { channelId, channelSecret, baseUrl } = getLinePayConfig();
  const nonce = crypto.randomUUID();
  const signature = signLinePay(channelSecret, apiPath, body, nonce);

  const response = await fetch(`${baseUrl}${apiPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-LINE-ChannelId": channelId,
      "X-LINE-Authorization-Nonce": nonce,
      "X-LINE-Authorization": signature
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const data = parseLinePayResponse(text);

  if (!response.ok || data.returnCode !== "0000") {
    const error = new Error(`LINE Pay Confirm 失敗：${data.returnCode || response.status}｜${data.returnMessage || text}`);
    error.statusCode = 502;
    throw error;
  }

  return data;
}

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data && data.message ? data.message : text;
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  return data;
}

async function getOrCreateCredits(userId) {
  const existing = await supabaseRequest(`/rest/v1/user_credits?user_id=eq.${userId}&select=remaining_credits`);

  if (Array.isArray(existing) && existing.length > 0) {
    return existing[0].remaining_credits;
  }

  const inserted = await supabaseRequest("/rest/v1/user_credits", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      remaining_credits: 3
    })
  });

  return Array.isArray(inserted) && inserted[0] ? inserted[0].remaining_credits : 3;
}

async function updateCredits(userId, remainingCredits) {
  const updated = await supabaseRequest(`/rest/v1/user_credits?user_id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      remaining_credits: remainingCredits,
      updated_at: new Date().toISOString()
    })
  });

  return Array.isArray(updated) && updated[0] ? updated[0].remaining_credits : remainingCredits;
}

function redirect(res, path) {
  res.setHeader("Location", path);
  return res.status(302).send("");
}

export default async function handler(req, res) {
  try {
    const orderId = Number(req.query.orderId);
    const transactionId = String(req.query.transactionId || "");

    if (!orderId || !transactionId) {
      return redirect(res, "/?payment=linepay_error");
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return redirect(res, "/?payment=linepay_error");
    }

    const orders = await supabaseRequest(
      `/rest/v1/purchase_orders?id=eq.${orderId}&provider_order_id=eq.${transactionId}&select=*`
    );
    const order = Array.isArray(orders) && orders[0] ? orders[0] : null;

    if (!order) {
      console.error("LINE Pay order not found", { orderId, transactionId });
      return redirect(res, "/?payment=linepay_error");
    }

    if (order.status === "paid") {
      return redirect(res, "/?payment=linepay_success");
    }

    const apiPath = `/v3/payments/${transactionId}/confirm`;
    const confirmBody = {
      amount: Number(order.amount_twd),
      currency: "TWD"
    };

    const confirmResult = await callLinePayPost(apiPath, confirmBody);

    const currentCredits = await getOrCreateCredits(order.user_id);
    const remainingCredits = currentCredits + Number(order.credits);

    await updateCredits(order.user_id, remainingCredits);

    await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        paid_at: new Date().toISOString(),
        provider: "line_pay_sandbox",
        updated_at: new Date().toISOString()
      })
    });

    await supabaseRequest("/rest/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: order.id,
        user_id: order.user_id,
        provider: "line_pay_sandbox",
        provider_transaction_id: transactionId,
        amount_twd: order.amount_twd,
        currency: "TWD",
        status: "paid",
        raw_payload: confirmResult
      })
    });

    await supabaseRequest("/rest/v1/credit_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: order.user_id,
        type: "purchase",
        amount: order.credits,
        reason: `LINE Pay Sandbox｜訂單 #${order.id}｜${order.plan_id}`
      })
    });

    return redirect(res, "/?payment=linepay_success");
  } catch (error) {
    console.error(error);
    return redirect(res, "/?payment=linepay_error");
  }
}
