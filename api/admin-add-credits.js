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

async function findUserByEmail(targetEmail) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const normalized = String(targetEmail || "").trim().toLowerCase();

  // Supabase Auth Admin API. We list users and find the email because email
  // lookup availability differs by project/API version.
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`
      }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data && data.msg ? data.msg : "讀取使用者清單失敗。");
    }

    const users = Array.isArray(data && data.users) ? data.users : [];
    const found = users.find(user => String(user.email || "").toLowerCase() === normalized);

    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
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
      remaining_credits: 10
    })
  });

  await supabaseRequest("/rest/v1/credit_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      type: "signup_bonus",
      amount: 10,
      reason: "新會員免費 10 次生成"
    })
  });

  return Array.isArray(inserted) && inserted[0] ? inserted[0].remaining_credits : 10;
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

  if (!process.env.ADMIN_EMAILS) {
    return res.status(403).json({
      error: "尚未設定 ADMIN_EMAILS，因此管理員補點功能已停用。"
    });
  }

  try {
    const admin = await getUserFromToken(req);

    if (!isAdminEmail(admin.email)) {
      return res.status(403).json({
        error: "你不是管理員，不能使用手動補點功能。"
      });
    }

    const body = req.body || {};
    const targetEmail = String(body.targetEmail || "").trim().toLowerCase();
    const amount = Math.max(1, Math.min(1000, Number(body.amount || 0)));
    const reason = String(body.reason || "手動補點").trim().slice(0, 120);

    if (!targetEmail || !targetEmail.includes("@")) {
      return res.status(400).json({ error: "請提供正確的使用者 Email。" });
    }

    if (!amount) {
      return res.status(400).json({ error: "請提供正確的增加次數。" });
    }

    const targetUser = await findUserByEmail(targetEmail);

    if (!targetUser || !targetUser.id) {
      return res.status(404).json({
        error: "找不到這個 Email 的會員。請確認對方已註冊並完成登入。"
      });
    }

    const currentCredits = await getOrCreateCredits(targetUser.id);
    const remainingCredits = currentCredits + amount;

    await updateCredits(targetUser.id, remainingCredits);

    await supabaseRequest("/rest/v1/credit_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: targetUser.id,
        type: "manual_add",
        amount,
        reason
      })
    });

    return res.status(200).json({
      targetEmail,
      added: amount,
      remainingCredits
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "手動補點失敗。"
    });
  }
}
