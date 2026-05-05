export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const apiBase = (process.env.PAYUNI_API_BASE_URL || "https://sandbox-api.payuni.com.tw/api").replace(/\/$/, "");
  const merchantId = process.env.PAYUNI_MERCHANT_ID || "";
  const hashKey = process.env.PAYUNI_HASH_KEY || "";
  const ivKey = process.env.PAYUNI_IV_KEY || "";

  return res.status(200).json({
    apiBase,
    computedUppAction: `${apiBase}/upp`,
    merchantIdPreview: merchantId ? `${merchantId.slice(0, 4)}...${merchantId.slice(-4)}` : null,
    hasHashKey: Boolean(hashKey),
    hashKeyLength: hashKey.length,
    hasIvKey: Boolean(ivKey),
    ivKeyLength: ivKey.length,
    note: "PAYUNI_HASH_KEY / PAYUNI_IV_KEY 不會完整顯示。若 computedUppAction 不是 PAYUNi 網域，代表 Vercel 環境變數填錯。"
  });
}
