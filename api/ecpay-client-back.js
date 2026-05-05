export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=/" />
  <title>返回 Song Receipt Studio</title>
</head>
<body>
  <p>正在返回 Song Receipt Studio…</p>
  <script>location.href = "/";</script>
</body>
</html>`);
}
