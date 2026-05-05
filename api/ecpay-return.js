import crypto from "crypto";

function getEcpayConfig() {
  const hashKey = process.env.ECPAY_HASH_KEY || "5294y06JbISpM5x9";
  const hashIv = process.env.ECPAY_HASH_IV || "v77hoKGq4kWxNNIS";

  return { hashKey, hashIv };
}

function ecpayUrlEncode(value) {
  return encodeURIComponent(value)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2a/g, "*")
    .replace(/%2d/g, "-")
    .replace(/%2e/g, ".")
    .replace(/%5f/g, "_");
}

function generateCheckMacValue(params, hashKey, hashIv) {
  const filtered = { ...params };
  delete filtered.CheckMacValue;

  const sortedKeys = Object.keys(filtered).sort((a, b) => a.localeCompare(b));
  const raw = [
    `HashKey=${hashKey}`,
    ...sortedKeys.map(key => `${key}=${filtered[key]}`),
    `HashIV=${hashIv}`
  ].join("&");

  const encoded = ecpayUrlEncode(raw);

  return crypto
    .createHash("sha256")
    .update(encoded)
    .digest("hex")
    .toUpperCase();
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;

  if (typeof body === "string") {
    return Object.fromEntries(new URLSearchParams(body));
  }

  return {};
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

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).send("0|Method Not Allowed");
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).send("0|Missing Supabase env");
  }

  try {
    const params = normalizeBody(req.body);
    const { hashKey, hashIv } = getEcpayConfig();

    const expected = generateCheckMacValue(params, hashKey, hashIv);
    const received = String(params.CheckMacValue || "").toUpperCase();

    if (expected !== received) {
      console.error("ECPay CheckMacValue mismatch", { expected, received, params });
      return res.status(400).send("0|CheckMacValue Error");
    }

    const merchantTradeNo = String(params.MerchantTradeNo || "");
    const rtnCode = String(params.RtnCode || "");
    const tradeAmt = Number(params.TradeAmt || 0);

    const orders = await supabaseRequest(
      `/rest/v1/purchase_orders?provider_order_id=eq.${merchantTradeNo}&select=*`
    );
    const order = Array.isArray(orders) && orders[0] ? orders[0] : null;

    if (!order) {
      console.error("Order not found", merchantTradeNo);
      return res.status(404).send("0|Order Not Found");
    }

    if (Number(order.amount_twd) !== tradeAmt) {
      console.error("Amount mismatch", { orderAmount: order.amount_twd, tradeAmt });
      return res.status(400).send("0|Amount Error");
    }

    if (rtnCode !== "1") {
      await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "failed",
          updated_at: new Date().toISOString()
        })
      });

      return res.status(200).send("1|OK");
    }

    if (order.status === "paid") {
      return res.status(200).send("1|OK");
    }

    const currentCredits = await getOrCreateCredits(order.user_id);
    const remainingCredits = currentCredits + Number(order.credits);

    await updateCredits(order.user_id, remainingCredits);

    await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        paid_at: params.PaymentDate || new Date().toISOString(),
        provider: "ecpay_stage",
        updated_at: new Date().toISOString()
      })
    });

    await supabaseRequest("/rest/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: order.id,
        user_id: order.user_id,
        provider: "ecpay_stage",
        provider_transaction_id: params.TradeNo || null,
        amount_twd: tradeAmt,
        currency: "TWD",
        status: "paid",
        raw_payload: params
      })
    });

    await supabaseRequest("/rest/v1/credit_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: order.user_id,
        type: "purchase",
        amount: order.credits,
        reason: `綠界測試付款｜訂單 #${order.id}｜${order.plan_id}`
      })
    });

    return res.status(200).send("1|OK");
  } catch (error) {
    console.error(error);
    return res.status(500).send("0|Server Error");
  }
}
