import crypto from "crypto";

const CREDIT_PLANS = {
  starter: { credits: 10, amountTwd: 49, label: "小包" },
  standard: { credits: 30, amountTwd: 129, label: "中包" },
  pro: { credits: 100, amountTwd: 299, label: "大包" }
};

const ECPAY_STAGE_ACTION = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

function getEcpayConfig() {
  const merchantId = process.env.ECPAY_MERCHANT_ID || "2000132";
  const hashKey = process.env.ECPAY_HASH_KEY || "5294y06JbISpM5x9";
  const hashIv = process.env.ECPAY_HASH_IV || "v77hoKGq4kWxNNIS";
  const action = process.env.ECPAY_ACTION_URL || ECPAY_STAGE_ACTION;

  return { merchantId, hashKey, hashIv, action };
}

function formatTradeDate(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("/") + " " + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join(":");
}

function getOrigin(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;

  return `${protocol}://${host}`;
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

function createMerchantTradeNo() {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `SR${time}${rand}`.slice(0, 20);
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

    const { merchantId, hashKey, hashIv, action } = getEcpayConfig();
    const origin = getOrigin(req);
    const merchantTradeNo = createMerchantTradeNo();

    const inserted = await supabaseRequest("/rest/v1/purchase_orders", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        plan_id: planId,
        credits: plan.credits,
        amount_twd: plan.amountTwd,
        currency: "TWD",
        status: "pending",
        provider: "ecpay_stage",
        provider_order_id: merchantTradeNo
      })
    });

    const order = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;

    if (!order) {
      return res.status(500).json({ error: "訂單建立失敗。" });
    }

    const fields = {
      MerchantID: merchantId,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: formatTradeDate(),
      PaymentType: "aio",
      TotalAmount: String(plan.amountTwd),
      TradeDesc: `Song Receipt ${plan.credits} Credits`,
      ItemName: `Song Receipt ${plan.label} ${plan.credits}次生成`,
      ReturnURL: `${origin}/api/ecpay-return`,
      ChoosePayment: "ALL",
      ClientBackURL: `${origin}/?payment=back`,
      EncryptType: "1",
      CustomField1: String(order.id),
      CustomField2: planId,
      CustomField3: String(user.id),
      CustomField4: "song_receipt"
    };

    fields.CheckMacValue = generateCheckMacValue(fields, hashKey, hashIv);

    return res.status(200).json({
      order,
      payment: {
        action,
        fields
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "建立訂單失敗。"
    });
  }
}
