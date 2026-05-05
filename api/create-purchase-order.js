import crypto from "crypto";

const CREDIT_PLANS = {
  starter: { credits: 10, amountTwd: 49, label: "小包" },
  standard: { credits: 30, amountTwd: 129, label: "中包" },
  pro: { credits: 100, amountTwd: 299, label: "大包" }
};

function getPayuniConfig() {
  const merId = process.env.PAYUNI_MERCHANT_ID;
  const hashKey = process.env.PAYUNI_HASH_KEY;
  const ivKey = process.env.PAYUNI_IV_KEY;
  const apiBase = (process.env.PAYUNI_API_BASE_URL || "https://sandbox-api.payuni.com.tw/api").replace(/\/$/, "");

  if (!merId || !hashKey || !ivKey) {
    const error = new Error("尚未設定 PAYUNI_MERCHANT_ID、PAYUNI_HASH_KEY 或 PAYUNI_IV_KEY。");
    error.statusCode = 500;
    throw error;
  }

  return { merId, hashKey, ivKey, apiBase };
}

function getOrigin(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function createMerTradeNo(orderId) {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SR${orderId}${time}${rand}`.slice(0, 30);
}

function payuniEncrypt(encryptInfo, hashKey, ivKey) {
  const query = new URLSearchParams(
    Object.entries(encryptInfo).map(([key, value]) => [key, String(value ?? "")])
  ).toString();

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(hashKey.trim(), "utf8"),
    Buffer.from(ivKey.trim(), "utf8")
  );

  // PAYUNi PHP SDK 使用 openssl_encrypt 預設輸出 base64 字串，再與 tag 組合後轉 hex。
  const encrypted = Buffer.concat([cipher.update(query, "utf8"), cipher.final()]).toString("base64");
  const tag = cipher.getAuthTag().toString("base64");
  return Buffer.from(`${encrypted}:::${tag}`, "utf8").toString("hex");
}

function payuniHashInfo(encryptInfoHex, hashKey, ivKey) {
  return crypto.createHash("sha256").update(`${hashKey}${encryptInfoHex}${ivKey}`).digest("hex").toUpperCase();
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const message = data && data.message ? data.message : text;
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }
  return data;
}

async function getUserFromToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    const error = new Error("請先登入。");
    error.statusCode = 401;
    throw error;
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
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

  if (req.method !== "POST") return res.status(405).json({ error: "只接受 POST 請求。" });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "尚未設定 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。" });
  }

  try {
    const user = await getUserFromToken(req);
    const planId = String((req.body || {}).planId || "").trim();
    const plan = CREDIT_PLANS[planId];

    if (!plan) return res.status(400).json({ error: "無效的購買方案。" });

    const { merId, hashKey, ivKey, apiBase } = getPayuniConfig();
    const origin = getOrigin(req);

    const inserted = await supabaseRequest("/rest/v1/purchase_orders", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        plan_id: planId,
        credits: plan.credits,
        amount_twd: plan.amountTwd,
        currency: "TWD",
        status: "pending",
        provider: "payuni_sandbox"
      })
    });

    const order = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;
    if (!order) return res.status(500).json({ error: "訂單建立失敗。" });

    const merTradeNo = createMerTradeNo(order.id);

    await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        provider_order_id: merTradeNo,
        updated_at: new Date().toISOString()
      })
    });

    const encryptInfo = {
      MerID: merId,
      MerTradeNo: merTradeNo,
      TradeAmt: plan.amountTwd,
      Timestamp: Math.floor(Date.now() / 1000),
      ReturnURL: `${origin}/api/payuni-return`,
      NotifyURL: `${origin}/api/payuni-notify`,
      ProductName: `Song Receipt ${plan.label} ${plan.credits}次生成`,
      UserEmail: user.email || "",
      CustomField1: String(order.id),
      CustomField2: planId
    };

    const encryptInfoHex = payuniEncrypt(encryptInfo, hashKey, ivKey);
    const hashInfo = payuniHashInfo(encryptInfoHex, hashKey, ivKey);

    return res.status(200).json({
      order: { ...order, provider_order_id: merTradeNo },
      payment: {
        action: `${apiBase}/upp`,
        fields: {
          MerID: merId,
          Version: "1.0",
          EncryptInfo: encryptInfoHex,
          HashInfo: hashInfo
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ error: error.message || "建立 PAYUNi 訂單失敗。" });
  }
}
