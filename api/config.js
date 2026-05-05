export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: "尚未設定 SUPABASE_URL 或 SUPABASE_ANON_KEY。"
    });
  }

  return res.status(200).json({
    supabaseUrl,
    supabaseAnonKey
  });
}
