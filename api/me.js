
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

  await supabaseRequest("/rest/v1/credit_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      type: "signup_bonus",
      amount: 3,
      reason: "新會員免費生成次數"
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "尚未設定 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。"
    });
  }

  try {
    const user = await getUserFromToken(req);
    const remainingCredits = await getOrCreateCredits(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email
      },
      remainingCredits
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "讀取會員資料失敗。"
    });
  }
}
