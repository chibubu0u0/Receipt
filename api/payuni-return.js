import crypto from "crypto";

function getPayuniConfig() {
  const hashKey = process.env.PAYUNI_HASH_KEY;
  const ivKey = process.env.PAYUNI_IV_KEY;

  if (!hashKey || !ivKey) {
    const error = new Error("尚未設定 PAYUNI_HASH_KEY 或 PAYUNI_IV_KEY。");
    error.statusCode = 500;
    throw error;
  }

  return { hashKey, ivKey };
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  if (typeof body === "string") return Object.fromEntries(new URLSearchParams(body));
  return {};
}

function payuniHashInfo(encryptInfoHex, hashKey, ivKey) {
  return crypto
    .createHash("sha256")
    .update(`${hashKey}${encryptInfoHex}${ivKey}`)
    .digest("hex")
    .toUpperCase();
}

function payuniDecrypt(encryptInfoHex, hashKey, ivKey) {
  const decoded = Buffer.from(encryptInfoHex, "hex").toString("utf8");
  const [encryptedBase64, tagBase64] = decoded.split(":::");

  if (!encryptedBase64 || !tagBase64) {
    throw new Error("PAYUNi EncryptInfo 格式錯誤。");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(hashKey.trim(), "utf8"),
    Buffer.from(ivKey.trim(), "utf8")
  );

  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]).toString("utf8");

  return Object.fromEntries(new URLSearchParams(decrypted));
}

function decodePayuniResult(body) {
  const params = parseBody(body);
  const { hashKey, ivKey } = getPayuniConfig();

  if (!params.EncryptInfo || !params.HashInfo) {
    const error = new Error("缺少 PAYUNi EncryptInfo 或 HashInfo。");
    error.code = "MISSING_PAYUNI_PAYLOAD";
    throw error;
  }

  const expected = payuniHashInfo(String(params.EncryptInfo), hashKey, ivKey);
  const received = String(params.HashInfo || "").toUpperCase();

  if (expected !== received) {
    throw new Error("PAYUNi HashInfo 驗證失敗。");
  }

  const encryptInfo = payuniDecrypt(String(params.EncryptInfo), hashKey, ivKey);

  return {
    raw: params,
    status: params.Status || "",
    encryptInfo
  };
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
      remaining_credits: 10
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

async function findOrderByMerTradeNo(merTradeNo) {
  const orders = await supabaseRequest(
    `/rest/v1/purchase_orders?provider_order_id=eq.${encodeURIComponent(merTradeNo)}&select=*`
  );

  return Array.isArray(orders) && orders[0] ? orders[0] : null;
}

async function findOrderById(orderId) {
  const orders = await supabaseRequest(
    `/rest/v1/purchase_orders?id=eq.${Number(orderId)}&select=*`
  );

  return Array.isArray(orders) && orders[0] ? orders[0] : null;
}

async function markOrderPaidIfNeeded(order, result) {
  const encryptInfo = result.encryptInfo;
  const tradeAmt = Number(encryptInfo.TradeAmt || 0);
  const tradeStatus = String(encryptInfo.TradeStatus ?? "");
  const status = String(result.status || "");

  if (Number(order.amount_twd) !== tradeAmt) {
    throw new Error("PAYUNi 回傳金額與訂單金額不一致。");
  }

  if (status !== "SUCCESS") {
    return { paid: false, reason: `Status=${status}` };
  }

  if (tradeStatus !== "1") {
    return { paid: false, reason: `TradeStatus=${tradeStatus}` };
  }

  if (order.status === "paid") {
    return { paid: true, alreadyPaid: true };
  }

  const currentCredits = await getOrCreateCredits(order.user_id);
  const remainingCredits = currentCredits + Number(order.credits);

  await updateCredits(order.user_id, remainingCredits);

  await supabaseRequest(`/rest/v1/purchase_orders?id=eq.${order.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider: "payuni_sandbox",
      updated_at: new Date().toISOString()
    })
  });

  await supabaseRequest("/rest/v1/payments", {
    method: "POST",
    body: JSON.stringify({
      order_id: order.id,
      user_id: order.user_id,
      provider: "payuni_sandbox",
      provider_transaction_id: encryptInfo.TradeNo || encryptInfo.PayNo || null,
      amount_twd: tradeAmt,
      currency: "TWD",
      status: "paid",
      raw_payload: {
        raw: result.raw,
        encryptInfo
      }
    })
  });

  await supabaseRequest("/rest/v1/credit_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: order.user_id,
      type: "purchase",
      amount: order.credits,
      reason: `PAYUNi｜訂單 #${order.id}｜${order.plan_id}`
    })
  });

  return { paid: true, remainingCredits };
}

function redirect(res, path) {
  res.setHeader("Location", path);
  return res.status(302).send("");
}

function safeQuery(value) {
  return encodeURIComponent(String(value || "").slice(0, 120));
}

export default async function handler(req, res) {
  try {
    const bodyOrQuery = req.method === "POST" ? req.body : req.query;
    const orderIdFromQuery = req.query && req.query.orderId ? Number(req.query.orderId) : null;

    let result = null;
    let order = null;

    try {
      result = decodePayuniResult(bodyOrQuery);
      const merTradeNo = String(result.encryptInfo.MerTradeNo || "");
      order = await findOrderByMerTradeNo(merTradeNo);
    } catch (error) {
      if (error.code !== "MISSING_PAYUNI_PAYLOAD") {
        throw error;
      }

      // 有些 PAYUNi ReturnURL 只負責把瀏覽器帶回來，不一定附上 EncryptInfo / HashInfo。
      // 因此 ReturnURL 缺資料時不應直接判定失敗，改用 orderId 查詢訂單狀態；
      // 真正加點仍以 NotifyURL 或帶完整 payload 的 ReturnURL 為準。
      console.warn("PAYUNi return without EncryptInfo/HashInfo; fallback to order status.", {
        orderId: orderIdFromQuery
      });

      if (!orderIdFromQuery) {
        return redirect(res, "/?payment=payuni_pending&reason=missing_payload");
      }

      order = await findOrderById(orderIdFromQuery);

      if (!order) {
        return redirect(res, "/?payment=payuni_error&reason=order_not_found");
      }

      if (order.status === "paid") {
        return redirect(res, "/?payment=payuni_success");
      }

      return redirect(res, "/?payment=payuni_pending&reason=waiting_notify");
    }

    if (!order) {
      console.error("PAYUNi return order not found", { result });
      return redirect(res, "/?payment=payuni_error&reason=order_not_found");
    }

    const outcome = await markOrderPaidIfNeeded(order, result);

    if (outcome.paid) {
      return redirect(res, "/?payment=payuni_success");
    }

    return redirect(res, `/?payment=payuni_pending&reason=${safeQuery(outcome.reason)}`);
  } catch (error) {
    console.error("PAYUNi return error:", error);
    return redirect(res, `/?payment=payuni_error&reason=${safeQuery(error.message)}`);
  }
}
