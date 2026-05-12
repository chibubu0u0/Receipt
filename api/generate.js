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


function normalizeForCompare(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft|featuring)\.?\b/g, " ")
    .replace(/\(.*?\)|\[.*?\]|（.*?）|【.*?】/g, " ")
    .replace(/['’`´"]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactForCompare(value) {
  return normalizeForCompare(value).replace(/\s+/g, "");
}

function levenshteinSimilarity(a, b) {
  const left = compactForCompare(a);
  const right = compactForCompare(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const distance = dp[left.length][right.length];
  return 1 - distance / Math.max(left.length, right.length);
}

function textMatchScore(input, candidate) {
  const inputNorm = normalizeForCompare(input);
  const candidateNorm = normalizeForCompare(candidate);
  const inputCompact = compactForCompare(input);
  const candidateCompact = compactForCompare(candidate);

  if (!inputNorm || !candidateNorm) return 0;
  if (inputCompact === candidateCompact) return 1;

  const withoutVersion = candidateNorm
    .replace(/\b(remaster(ed)?|live|acoustic|radio edit|single version|album version|explicit|clean)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const withoutVersionCompact = withoutVersion.replace(/\s+/g, "");

  if (inputCompact === withoutVersionCompact) return 0.96;
  if (candidateCompact.includes(inputCompact) || inputCompact.includes(candidateCompact)) return 0.86;

  return levenshteinSimilarity(input, candidate);
}

function artistMatchScore(input, candidate) {
  const inputNorm = normalizeForCompare(input);
  const candidateNorm = normalizeForCompare(candidate);
  const inputCompact = compactForCompare(input);
  const candidateCompact = compactForCompare(candidate);

  if (!inputNorm || !candidateNorm) return 0;
  if (inputCompact === candidateCompact) return 1;
  if (candidateCompact.includes(inputCompact) || inputCompact.includes(candidateCompact)) return 0.82;

  return levenshteinSimilarity(input, candidate);
}

function scoreCandidate(inputArtist, inputSong, candidate) {
  const titleScore = textMatchScore(inputSong, candidate.song);
  const artistScore = artistMatchScore(inputArtist, candidate.artist);
  const totalScore = titleScore * 0.68 + artistScore * 0.32;

  return {
    ...candidate,
    titleScore,
    artistScore,
    totalScore
  };
}

function isAcceptedSongMatch(scored) {
  if (!scored) return false;

  // 歌名要相當接近，歌手至少要有合理關聯；避免只因曲名常見而誤判。
  if (scored.titleScore >= 0.93 && scored.artistScore >= 0.45) return true;
  if (scored.titleScore >= 0.82 && scored.artistScore >= 0.72) return true;
  if (scored.titleScore >= 0.76 && scored.artistScore >= 0.86) return true;

  return false;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  const results = [];

  for (const item of candidates) {
    const key = `${compactForCompare(item.artist)}::${compactForCompare(item.song)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }

  return results;
}

async function searchITunesSong(artist, song) {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", `${artist} ${song}`);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "12");
  url.searchParams.set("country", "TW");

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`iTunes Search failed: ${response.status}`);
  }

  const data = await response.json();

  return Array.isArray(data.results)
    ? data.results
        .filter(item => item.wrapperType === "track" && item.kind === "song")
        .map(item => ({
          artist: item.artistName || "",
          song: item.trackName || "",
          album: item.collectionName || "",
          source: "iTunes"
        }))
    : [];
}

async function searchMusicBrainzSong(artist, song) {
  const query = `recording:"${song.replace(/"/g, "")}" AND artist:"${artist.replace(/"/g, "")}"`;
  const url = new URL("https://musicbrainz.org/ws/2/recording/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "10");

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "SongReceiptStudio/1.0 (https://receipt-six-tau.vercel.app)"
    }
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz Search failed: ${response.status}`);
  }

  const data = await response.json();

  return Array.isArray(data.recordings)
    ? data.recordings.map(item => ({
        artist: Array.isArray(item["artist-credit"])
          ? item["artist-credit"].map(credit => credit.artist && credit.artist.name ? credit.artist.name : credit.name || "").filter(Boolean).join(" / ")
          : "",
        song: item.title || "",
        album: Array.isArray(item.releases) && item.releases[0] ? item.releases[0].title || "" : "",
        source: "MusicBrainz"
      }))
    : [];
}

async function validateSongExists(artist, song) {
  const searchTasks = [
    searchITunesSong(artist, song).catch(error => {
      console.warn("iTunes validation failed:", error.message);
      return [];
    }),
    searchMusicBrainzSong(artist, song).catch(error => {
      console.warn("MusicBrainz validation failed:", error.message);
      return [];
    })
  ];

  const results = (await Promise.all(searchTasks)).flat();
  const candidates = uniqueCandidates(results)
    .map(candidate => scoreCandidate(artist, song, candidate))
    .sort((a, b) => b.totalScore - a.totalScore);

  const best = candidates[0] || null;

  if (isAcceptedSongMatch(best)) {
    return {
      found: true,
      canonical: {
        artist: best.artist,
        song: best.song,
        album: best.album || "",
        source: best.source
      },
      suggestions: candidates.slice(0, 3)
    };
  }

  return {
    found: false,
    canonical: null,
    suggestions: candidates
      .filter(item => item.titleScore >= 0.35 || item.artistScore >= 0.5)
      .slice(0, 3)
      .map(item => ({
        artist: item.artist,
        song: item.song,
        album: item.album || "",
        source: item.source
      }))
  };
}

function makeSongNotFoundMessage(artist, song, suggestions = []) {
  const base = `查無此歌曲，這次不會扣除生成次數。\n請確認「歌名」欄位輸入的是歌曲名稱，不是歌手名、專輯名或歌詞片段。`;

  if (!suggestions.length) {
    return `${base}\n你要的是「${song}」這首歌嗎？如果是，請確認歌手與歌名拼字後再試一次。`;
  }

  const suggestionText = suggestions
    .map((item, index) => `${index + 1}. ${item.artist} - ${item.song}`)
    .join("\n");

  return `${base}\n你要的是下面其中一首歌嗎？\n${suggestionText}`;
}


function buildInstructions(depth, note) {
  const depthRule = {
    standard: "標準分析：請清楚、簡潔、好讀。情緒描述要直覺，物件意象不要太抽象，適合一般社群分享。文字長度偏短，重點是快速理解歌曲氛圍。",
    deep: "深層進化：請明顯比標準分析更深入。加入心理狀態、時間感、空間感、聽覺動態與記憶物件；每個具現化物件都要有較深的情緒原因。文字可以更細膩、更像品牌企劃在設計一張情緒商品小票。",
    director: "導演版：請明顯比其他模式更有影像感。像音樂錄影帶導演與藝術總監，使用鏡頭、光線、色溫、場景調度、道具與劇照感描述。色彩要更精準，物件要像能被拍成一張電影劇照。"
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
- soul：2 到 3 句，每句都要有具體場景、動作或感官細節。標準分析要清楚；深層進化要更細膩；導演版要更像鏡頭描述。
- tagline：12 字以內，像唱片行牆上的一句標語。
- emotions：4 個，name 要具體有畫面，label 2-4 字，value 0-100。
- colors：3 個，hex 合法，必須根據「這首歌」的情緒、曲名意象、歌手風格與聽感重新選色。不要反覆使用固定色票或示範色，例如 #8BA89C、#D7BFA6、#4B4A44。name 不要只說顏色，要像詩意色名，且要貼合歌曲畫面。三個顏色請分別代表：主情緒色、記憶/場景色、陰影/餘韻色。
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


function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function hashText(value) {
  const text = String(value || "");
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = channel => Math.round((channel + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function makeSongSpecificPalette(artist, song, vibe = "") {
  const seed = hashText(`${artist}::${song}::${vibe}`);
  const baseHue = seed % 360;
  const shiftA = 35 + (seed % 22);
  const shiftB = 150 + (seed % 50);

  const descriptors = [
    "主情緒光",
    "場景殘影",
    "餘韻陰影"
  ];

  return [
    {
      hex: hslToHex(baseHue, 42 + (seed % 18), 44 + (seed % 10)),
      name: `${song.slice(0, 6) || "歌曲"}的${descriptors[0]}`
    },
    {
      hex: hslToHex(baseHue + shiftA, 36 + (seed % 16), 66 + (seed % 8)),
      name: `${artist.slice(0, 6) || "歌手"}聲線旁的${descriptors[1]}`
    },
    {
      hex: hslToHex(baseHue + shiftB, 30 + (seed % 18), 28 + (seed % 10)),
      name: `副歌退場後的${descriptors[2]}`
    }
  ];
}

function ensureSongSpecificColors(data, artist, song) {
  const demoHexes = new Set(["#8BA89C", "#D7BFA6", "#4B4A44"]);
  const colors = Array.isArray(data.colors) ? data.colors : [];
  const validColors = colors
    .slice(0, 3)
    .filter(item => item && isValidHexColor(item.hex));

  const normalizedHexes = validColors.map(item => item.hex.trim().toUpperCase());
  const allDemoColors = normalizedHexes.length === 3 && normalizedHexes.every(hex => demoHexes.has(hex));
  const notEnoughColors = validColors.length < 3;
  const duplicateColors = new Set(normalizedHexes).size < normalizedHexes.length;

  if (notEnoughColors || allDemoColors || duplicateColors) {
    data.colors = makeSongSpecificPalette(artist, song, data.vibe || data.tagline || "");
    return data;
  }

  data.colors = colors.slice(0, 3).map((item, index) => ({
    hex: String(item.hex || validColors[index]?.hex || "#8BA89C").trim().toUpperCase(),
    name: String(item.name || ["主情緒色", "場景色", "餘韻色"][index]).slice(0, 48)
  }));

  return data;
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

    const body = req.body || {};
    const artist = String(body.artist || "").trim();
    const song = String(body.song || "").trim();
    const note = String(body.note || "").trim();
    const depth = String(body.depth || "standard").trim();

    if (!artist || !song) {
      return res.status(400).json({ error: "請輸入歌手與歌名。" });
    }

    const validation = await validateSongExists(artist, song);

    if (!validation.found) {
      const currentCredits = await getOrCreateCredits(user.id);

      return res.status(404).json({
        code: "song_not_found",
        error: makeSongNotFoundMessage(artist, song, validation.suggestions),
        suggestions: validation.suggestions,
        remainingCredits: currentCredits
      });
    }

    const currentCredits = await getOrCreateCredits(user.id);

    if (currentCredits <= 0) {
      return res.status(402).json({
        error: "你的生成次數已用完。若需要更多次數，請私訊 Instagram 或寄信聯絡。",
        remainingCredits: 0
      });
    }

    const verifiedArtist = validation.canonical && validation.canonical.artist ? validation.canonical.artist : artist;
    const verifiedSong = validation.canonical && validation.canonical.song ? validation.canonical.song : song;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: buildInstructions(depth, note),
        input: `請分析：歌手「${verifiedArtist}」，歌曲「${verifiedSong}」。此歌曲已通過資料庫存在性檢查，請以此正式歌曲資訊分析。`,
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

    data = ensureSongSpecificColors(data, verifiedArtist, verifiedSong);

    const remainingCredits = Math.max(0, currentCredits - 1);
    await updateCredits(user.id, remainingCredits);

    await supabaseRequest("/rest/v1/credit_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        type: "generation",
        amount: -1,
        reason: `${verifiedArtist} - ${verifiedSong}`
      })
    });

    await supabaseRequest("/rest/v1/receipts", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        artist: verifiedArtist,
        song: verifiedSong,
        result_json: data
      })
    });

    return res.status(200).json({
      data,
      verifiedSong: { artist: verifiedArtist, song: verifiedSong },
      remainingCredits
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "後端產生失敗，請稍後再試。"
    });
  }
}
