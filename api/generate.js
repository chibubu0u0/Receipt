const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const iconEnum = [
  "moon",
  "star",
  "heart",
  "sun",
  "cloud",
  "eye",
  "wave",
  "drop",
  "wind",
  "mountain",
  "clock",
  "ghost",
  "music",
  "circle"
];

const songReceiptSchema = {
  type: "object",
  additionalProperties: false,
  required: ["soul", "tagline", "emotions", "colors", "melody", "objects", "items", "closing", "vibe"],
  properties: {
    soul: { type: "string" },
    tagline: { type: "string" },
    emotions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["icon", "name", "label", "value"],
        properties: {
          icon: { type: "string", enum: iconEnum },
          name: { type: "string" },
          label: { type: "string" },
          value: { type: "number" }
        }
      }
    },
    colors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["hex", "name"],
        properties: {
          hex: { type: "string" },
          name: { type: "string" }
        }
      }
    },
    melody: {
      type: "object",
      additionalProperties: false,
      required: ["contour", "sections", "label"],
      properties: {
        contour: { type: "array", items: { type: "number" } },
        sections: { type: "array", items: { type: "string" } },
        label: { type: "string" }
      }
    },
    objects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "meaning"],
        properties: {
          name: { type: "string" },
          meaning: { type: "string" }
        }
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "intensity"],
        properties: {
          name: { type: "string" },
          intensity: { type: "number" }
        }
      }
    },
    closing: { type: "string" },
    vibe: { type: "string" }
  }
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

function buildInstructions(depth, note) {
  const depthRule = {
    standard: "分析清楚、詩意但不要過度艱澀，適合一般社群分享。",
    deep: "請更深一層：加入具體場景、心理狀態、聽覺動態與可視化物件，像品牌企劃在設計一張情緒商品小票。",
    director: "請像音樂錄影帶導演與藝術總監：文字更有畫面，色彩更精準，物件更像可以拍成一張劇照。"
  }[depth] || "分析清楚、詩意但不要過度艱澀。";

  return `你是一位結合音樂評論家、品牌藝術總監與唱片行店員的創作顧問。
任務：把用戶提供的歌手與歌曲，轉換成一張「AI 情感收據」所需的 JSON。

重要限制：
- 不要引用或改寫任何完整歌詞。可以描述情緒、聲音、氛圍與可推測的畫面。
- 如果你不確定冷門歌曲的完整資料，根據歌手風格、曲名語意與可推測的音樂情緒生成，但不要假裝知道不存在的細節。
- 只回傳 JSON，不要 markdown，不要解釋。

本次深度規則：${depthRule}
用戶補充語氣：${note || "無"}

欄位寫作規則：
- soul：2 到 3 句，每句都要有具體場景、動作或感官細節。
- tagline：12 字以內，像唱片行牆上的一句標語。
- emotions：4 個，name 要具體有畫面，label 2-4 字，value 0-100。
- colors：3 個，hex 合法，name 不要只說顏色，要像詩意色名。
- melody.contour：20 個左右 0-100 的數字，反映歌曲情感動態，不要全部平。
- melody.sections：5-7 個繁體中文段落名。
- objects：3 個「歌曲具現化」的元素，像 MV 道具、記憶物件、場景符號，搭配它代表的情緒意義。
- items：3-5 個心情結帳項目，name 是情緒商品，intensity 一律是 0-100 的數字，代表情緒強度。不要輸出 qty，數量會由系統依照強度自動換算，確保數量與強度呈正比。
- closing：一句給聽眾的短短建議。
- vibe：10 字以內，核心氛圍。`;
}

function getOutputText(result) {
  if (typeof result.output_text === "string") return result.output_text;

  if (Array.isArray(result.output)) {
    return result.output
      .flatMap(item => item.content || [])
      .map(part => part.text || "")
      .join("\n");
  }

  return "";
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "只接受 POST 請求。" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "後端尚未設定 OPENAI_API_KEY。"
    });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "尚未設定 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。"
    });
  }

  try {
    const user = await getUserFromToken(req);
    const currentCredits = await getOrCreateCredits(user.id);

    if (currentCredits <= 0) {
      return res.status(402).json({
        error: "你的生成次數已用完。下一步可以接付款系統來購買次數。",
        remainingCredits: 0
      });
    }

    const body = req.body || {};
    const artist = String(body.artist || "").trim();
    const song = String(body.song || "").trim();
    const note = String(body.note || "").trim();
    const depth = String(body.depth || "standard").trim();

    if (!artist || !song) {
      return res.status(400).json({ error: "請輸入歌手與歌名。" });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: buildInstructions(depth, note),
        input: `請分析：歌手「${artist}」，歌曲「${song}」。`,
        temperature: depth === "director" ? 0.98 : 0.88,
        max_output_tokens: 2200,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "song_receipt_studio",
            strict: true,
            schema: songReceiptSchema
          }
        }
      })
    });

    const rawText = await openaiResponse.text();
    let result = null;

    try {
      result = JSON.parse(rawText);
    } catch {
      result = null;
    }

    if (!openaiResponse.ok) {
      const apiMessage = result && result.error && result.error.message
        ? result.error.message
        : rawText.slice(0, 240);

      return res.status(openaiResponse.status).json({
        error: `OpenAI API 回應失敗：${openaiResponse.status}｜${apiMessage || "未知錯誤"}`
      });
    }

    const outputText = getOutputText(result);

    if (!outputText.trim()) {
      return res.status(502).json({ error: "OpenAI 沒有回傳可解析內容。" });
    }

    let data;

    try {
      data = JSON.parse(outputText);
    } catch {
      return res.status(502).json({ error: "OpenAI 回傳的 JSON 無法解析。" });
    }

    const remainingCredits = Math.max(0, currentCredits - 1);
    await updateCredits(user.id, remainingCredits);

    await supabaseRequest("/rest/v1/credit_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        type: "generation",
        amount: -1,
        reason: `${artist} - ${song}`
      })
    });

    await supabaseRequest("/rest/v1/receipts", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        artist,
        song,
        result_json: data
      })
    });

    return res.status(200).json({
      data,
      remainingCredits
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "後端產生失敗，請稍後再試。"
    });
  }
}
