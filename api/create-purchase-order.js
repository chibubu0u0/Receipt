import crypto from "crypto";

const CREDIT_PLANS = {
  starter: { credits: 10, amountTwd: 49, label: "小包" },
  standard: { credits: 30, amountTwd: 129, label: "中包" },
  pro: { credits: 100, amountTwd: 299, label: "大包" }
};

const LINE_PAY_SANDBOX_BASE_URL = "https://sandbox-api-pay.line.me";

function getLinePayConfig() {
  const channelId = process.env.LINE_PAY_CHANNEL_ID;
  const channelSecret = process.env.LINE_PAY_CHANNEL_SECRET;
  const baseUrl = process.env.LINE_PAY_API_BASE_URL || LINE_PAY_SANDBOX_BASE_URL;

  if (!channelId || !channelSecret) {
    const error = new Error("尚未設定 LINE_PAY_CHANNEL_ID 或 LINE_PAY_CHANNEL_SECRET。請先申請 LINE Pay Sandbox 並設定到 Vercel Environment Variables。");
    error.statusCode = 500;
    throw error;
  }

  return { channelId, channelSecret, baseUrl };
}

function getOrigin(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;

  return `${protocol}://${host}`;
}

function createMerchantOrderId(orderId) {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `SR${orderId}${time}${rand}`.slice(0, 100);
}

function signLinePay(channelSecret, apiPath, body, nonce) {
  const message = channelSecret + apiPath + JSON.stringify(body) + nonce;

  return crypto
    .createHmac("sha256", channelSecret)
    .update(message)
    .digest("base64");
}

function parseLinePayResponse(text) {
  // LINE Pay transactionId can exceed JS safe integer, so keep long numbers as strings.
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
    const error = new Error(`LINE Pay API 失敗：${data.returnCode || response.status}｜${data.returnMessage || text}`);
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

async function getUserFromToken(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    const error = new Error("請先登入。");
    error.statusCode = 401;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${token}`
    }
  });

  const user = await response.json().catch(() => null);

  if (!response.ok || !user || !user.id) {
    const error = new Error("登入狀態已失效，請重新登入。");
    error.statusCode = 401;
    throw error;
  }

  return user;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "只接受 POST 請求。" });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "尚未設定 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。"
    });
  }

  try {
    const user = await getUserFromToken(req);
    const body = req.body || {};
    const planId = String(body.planId || "").trim();
    const plan = CREDIT_PLANS[planId];

    if (!plan) {
      return res.status(400).json({ error: "無效的購買方案。" });
    }

    const inserted = await supabaseRequest("/rest/v1/purchase_orders", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        plan_id: planId,
        credits: plan.credits,
        amount_twd: plan.amountTwd,
        currency: "TWD",
        status: "pending",
        provider: "line_pay_sandbox"
      })
    });

    const order = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;

    if (!order) {
      return res.status(500).json({ error: "訂單建立失敗。" });
    }

    const origin = getOrigin(req);
    const merchantOrderId = createMerchantOrderId(order.id);
    const apiPath = "/v3/payments/request";

    const requestBody = {
      amount: plan.amountTwd,
      currency: "TWD",
      orderId: merchantOrderId,
      packages: [
        {
          id: String(order.id),
          amount: plan.amountTwd,
          products: [
            {
              id: planId,
              name: `Song Receipt ${plan.label} ${plan.credits}次生成`,
              quantity: 1,
              price: plan.amountTwd
            }
          ]
        }
      ],
      redirectUrls: {
        confirmUrl: `${origin}/api/linepay-confirm?orderId=${order.id}`,
        cancelUrl: `${origin}/?payment=linepay_cancelled`
      }
    };

    const linePayResult = await callLinePayPost(apiPath, requestBody);
    const transactionId = String(linePayResult.info.transactionId || "");

    await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        provider_order_id: transactionId,
        updated_at: new Date().toISOString()
      })
    });

    return res.status(200).json({
      order: {
        ...order,
        provider_order_id: transactionId
      },
      paymentUrl: linePayResult.info.paymentUrl.web,
      appPaymentUrl: linePayResult.info.paymentUrl.app
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "建立 LINE Pay 訂單失敗。"
    });
  }
}
