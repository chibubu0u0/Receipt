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


## 購買方案介面版本

這版新增「購買生成次數」方案區塊：

- 小包：10 次｜NT$49
- 中包：30 次｜NT$129
- 大包：100 次｜NT$299

目前付款功能尚未串接，點擊方案會顯示提示。下一步可以接 TapPay / 綠界 / 藍新付款，付款成功後更新 `user_credits.remaining_credits` 並新增 `credit_logs`。


## 購買方案開關選單版本

這版將「購買生成次數」改成可展開 / 收合的選單：

- 預設收合，畫面更乾淨
- 點擊「購買生成次數」才展開價格方案
- 保留三個方案：10 次 NT$49、30 次 NT$129、100 次 NT$299


## 管理員測試加點版本

這版新增：

- 登入後若使用者 email 在 `ADMIN_EMAILS` 名單內，會顯示「測試加 10 次」按鈕
- 點擊後會呼叫 `/api/add-test-credits`
- 後端會驗證登入者是否為管理員
- 成功後更新 `user_credits.remaining_credits`
- 成功後寫入 `credit_logs`，type 為 `purchase_test`

### Vercel 需要新增環境變數

```txt
ADMIN_EMAILS=你的登入email@example.com
```

如果有多個管理員，用逗號分隔：

```txt
ADMIN_EMAILS=you@example.com,partner@example.com
```

設定完後請重新 Redeploy。


## 付款訂單架構版本

這版新增付款前置架構：

### 新增資料表

請到 Supabase SQL Editor 執行：

```txt
supabase/payment_setup.sql
```

會建立：

- `purchase_orders`：購買訂單
- `payments`：付款紀錄

### 新增 API

- `/api/create-purchase-order`
  - 登入者點選方案後建立 pending 訂單
  - 目前不導向付款頁，之後接 TapPay / 綠界 / 藍新時使用

- `/api/mark-order-paid-test`
  - 管理員測試用
  - 傳入 orderId 後，會把 pending 訂單改成 paid，並增加對應生成次數
  - 正式上線前可保留管理員限制，或改成金流 webhook 專用流程

### 目前方案

- starter：10 次｜NT$49
- standard：30 次｜NT$129
- pro：100 次｜NT$299

### 下一步接金流時的流程

1. 使用者點方案，建立 `purchase_orders`
2. 後端向金流建立付款請求
3. 使用者完成付款
4. 金流 webhook 通知你的後端
5. 後端驗證簽章與金額
6. 寫入 `payments`
7. 更新 `purchase_orders.status = paid`
8. 增加 `user_credits.remaining_credits`
9. 寫入 `credit_logs`


## 購買確認流程修正

這版修正購買流程：

- 點擊小包 / 中包 / 大包時，只會選擇方案，不會立刻建立 `purchase_orders`
- 選擇方案後，下方會出現確認按鈕，例如「加 10 次」
- 只有點擊「加 10 次 / 加 30 次 / 加 100 次」後，才會呼叫 `/api/create-purchase-order` 並建立 pending 訂單
- 選中的方案會有高亮效果


## PAYUNi UPP 串接版

這版將購買生成次數改成 PAYUNi UNiPaypage（UPP）整合式支付頁流程。

### 新增 / 修改

- `/api/create-purchase-order`
  - 建立 `purchase_orders`
  - 依 PAYUNi SDK 流程產生 `EncryptInfo`
  - 產生 `HashInfo`
  - 回傳 PAYUNi UPP 表單資料給前端

- `/api/payuni-notify`
  - 接收 PAYUNi NotifyURL
  - 驗證 `HashInfo`
  - 解密 `EncryptInfo`
  - 若 `Status=SUCCESS` 且 `TradeStatus=1`，自動加生成次數

- `/api/payuni-return`
  - 接收 PAYUNi ReturnURL
  - 付款後導回網站
  - 顯示成功 / 待付款 / 失敗狀態

### Vercel Environment Variables

請在 Vercel 設定：

```txt
PAYUNI_MERCHANT_ID=你的商店代號
PAYUNI_HASH_KEY=你的 Hash Key
PAYUNI_IV_KEY=你的 IV Key
PAYUNI_API_BASE_URL=https://sandbox-api.payuni.com.tw/api
```

正式環境通常改成：

```txt
PAYUNI_API_BASE_URL=https://api.payuni.com.tw/api
```

並換成正式商店的 Merchant ID / Hash Key / IV Key。

### PAYUNi 後台要設定

請到 PAYUNi 後台的商店串接設定，設定：

```txt
NotifyURL=https://你的網域/api/payuni-notify
ReturnURL=https://你的網域/api/payuni-return
```

如果使用目前 Vercel 網域，可設定：

```txt
https://receipt-six-tau.vercel.app/api/payuni-notify
https://receipt-six-tau.vercel.app/api/payuni-return
```

### 注意

這版以 PAYUNi 官方 PHP SDK 的 UPP 流程轉成 Vercel / Node.js 實作。若你的 PAYUNi 帳號 API 文件要求額外欄位，請以 PAYUNi 後台或官方文件為準。
