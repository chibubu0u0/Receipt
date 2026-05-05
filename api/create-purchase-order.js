const CREDIT_PLANS = {
  starter: { credits: 10, amountTwd: 49, label: "小包" },
  standard: { credits: 30, amountTwd: 129, label: "中包" },
  pro: { credits: 100, amountTwd: 299, label: "大包" }
};

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
        provider: "manual_pending"
      })
    });

    const order = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;

    if (!order) {
      return res.status(500).json({ error: "訂單建立失敗。" });
    }

    return res.status(200).json({
      order,
      nextAction: "connect_payment_provider"
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "建立訂單失敗。"
    });
  }
}
