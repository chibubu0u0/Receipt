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

function isAdminEmail(email) {
  const adminEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email) && adminEmails.includes(String(email).toLowerCase());
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
    const admin = await getUserFromToken(req);

    if (!isAdminEmail(admin.email)) {
      return res.status(403).json({ error: "你不是管理員。" });
    }

    const body = req.body || {};
    const orderId = Number(body.orderId);

    if (!orderId) {
      return res.status(400).json({ error: "缺少 orderId。" });
    }

    const orders = await supabaseRequest(
      `/rest/v1/purchase_orders?id=eq.${orderId}&select=*`
    );
    const order = Array.isArray(orders) && orders[0] ? orders[0] : null;

    if (!order) {
      return res.status(404).json({ error: "找不到訂單。" });
    }

    if (order.status === "paid") {
      return res.status(200).json({
        order,
        message: "此訂單已經完成加點。"
      });
    }

    const currentCredits = await getOrCreateCredits(order.user_id);
    const remainingCredits = currentCredits + Number(order.credits);

    await updateCredits(order.user_id, remainingCredits);

    const updatedOrder = await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        paid_at: new Date().toISOString(),
        provider: "manual_test"
      })
    });

    await supabaseRequest("/rest/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: order.id,
        user_id: order.user_id,
        provider: "manual_test",
        provider_transaction_id: `manual-test-${Date.now()}`,
        amount_twd: order.amount_twd,
        currency: order.currency || "TWD",
        status: "paid",
        raw_payload: {
          note: "Admin manually marked order as paid for testing."
        }
      })
    });

    await supabaseRequest("/rest/v1/credit_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: order.user_id,
        type: "purchase",
        amount: order.credits,
        reason: `訂單 #${order.id}｜${order.plan_id}`
      })
    });

    return res.status(200).json({
      order: Array.isArray(updatedOrder) && updatedOrder[0] ? updatedOrder[0] : order,
      remainingCredits
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "測試付款完成失敗。"
    });
  }
}
