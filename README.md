# Song Receipt Studio

這是把單一 HTML 拆分後的版本：

- `index.html`：頁面結構
- `style.css`：視覺樣式
- `app.js`：互動邏輯、OpenAI API 呼叫、圖片輸出

## 使用方式

1. 解壓縮 zip
2. 打開資料夾
3. 用瀏覽器開啟 `index.html`

如果 API 請求被瀏覽器擋住，建議用 VS Code 的 Live Server 開啟。

## API Key

你可以直接在網頁欄位輸入 API Key。

如果只是在自己本機使用，也可以打開 `app.js`，把 API Key 填在：

```js
const OPENAI_API_KEY = "";
```

正式上線時，不建議把 API Key 放在前端，應該改用後端代理。

## 版本修正

- 修正熱感應紙上方黑色鋸齒／疊層問題：上緣改成乾淨平口，下緣保留撕紙感。

## 版本修正 2

- 將「場景物件」改名為「歌曲具現化」。
- 將「情緒明細」改名為「心情結帳」，並統一第三欄為 0-100% 的「強度」，避免數字與文字混用。

## 版本修正 3

- 修正「心情結帳」比例：AI 只產生 0-100% 強度，數量由系統自動換算，確保數量與強度呈正比。
- 換算規則：0-44% = 1、45-74% = 2、75-100% = 3。


## 後端 API 版本

這個版本已經把 OpenAI API 移到 Vercel 後端：

- 前端不再輸入 OpenAI API Key
- 前端會呼叫 `/api/generate`
- `/api/generate.js` 會在 Vercel 後端呼叫 OpenAI API
- API Key 要放在 Vercel Environment Variables

### Vercel 設定方式

1. 到 Vercel 專案
2. 進入 `Settings`
3. 點 `Environment Variables`
4. 新增：

```txt
OPENAI_API_KEY=你的 OpenAI API Key
```

可選：

```txt
OPENAI_MODEL=gpt-4.1-mini
```

5. 儲存後，回到 Deployments
6. 對最新部署按 `Redeploy`

正式公開前，建議再加入會員系統、生成次數限制與 rate limit，避免被大量呼叫。


## Supabase 登入 + 生成次數版本

這個版本新增：

- Email / Password 註冊與登入
- 新會員登入後自動建立 3 次免費生成次數
- 每成功生成一次扣 1 次
- 剩餘 0 次時阻擋生成
- 生成結果會寫入 `receipts`
- 點數變動會寫入 `credit_logs`

### 1. Supabase 建表

到 Supabase Dashboard → SQL Editor，貼上並執行：

```txt
supabase/setup.sql
```

### 2. Vercel Environment Variables

請在 Vercel Project → Settings → Environment Variables 新增：

```txt
OPENAI_API_KEY=你的 OpenAI API Key
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_ANON_KEY=你的 Supabase anon public key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
```

可選：

```txt
OPENAI_MODEL=gpt-4.1-mini
```

### 3. 重新部署

設定完 Vercel Environment Variables 後，請到 Deployments 重新 Redeploy。

### 4. 注意事項

- `SUPABASE_ANON_KEY` 可以給前端使用。
- `SUPABASE_SERVICE_ROLE_KEY` 絕對不要放在前端，只能放 Vercel Environment Variables。
- 目前扣點是 MVP 寫法，正式大量使用前建議改成 Supabase RPC / database function，避免多人同時請求時產生競態問題。
- 付款功能尚未接入，下一步可以串 TapPay / 綠界 / 藍新，付款成功後新增 credit log 並增加 `user_credits.remaining_credits`。


## 會員初始化修正

這版加入：

- `app.js?v=member-init-fix-1` 版本參數，避免瀏覽器讀到舊快取
- Supabase SDK 載入 fallback：jsDelivr 失敗時會改用 unpkg
- 登入 / 註冊時如果尚未初始化，會再嘗試初始化一次


## 我的生成紀錄版本

這版新增：

- 登入後顯示「我的生成紀錄」
- 從 Supabase `receipts` 讀取最近 10 筆生成紀錄
- 點擊紀錄可以重新載入該張收據
- 新增 `/api/receipts` 後端 API


## 初始次數顯示修正

這版將未登入狀態的生成次數顯示從 `— 次` 改成 `0 次`，避免使用者誤以為還有一次額度。


## 最近生成點擊權限修正

這版將「最近生成」改成不可點擊的本機紀錄展示。
只有登入後的「我的生成紀錄」可以點擊載入，且 `/api/receipts` 會依照目前登入使用者的 token 只回傳自己的生成紀錄。


## Email 驗證導回網站修正

這版在註冊時加入：

```js
options: {
  emailRedirectTo: window.location.origin
}
```

同時仍需要在 Supabase Dashboard 設定：

- Authentication → URL Configuration → Site URL
- Authentication → URL Configuration → Redirect URLs

建議都加入正式網站：

```txt
https://receipt-six-tau.vercel.app
https://receipt-six-tau.vercel.app/**
```
