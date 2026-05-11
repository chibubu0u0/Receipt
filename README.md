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


## PAYUNi Debug 版本

這版新增：

- `/api/payuni-debug`
  - 檢查 Vercel PAYUNI_API_BASE_URL
  - 顯示實際會送出的 UPP action URL
  - 顯示 Merchant ID 頭尾與 Hash / IV 是否存在
  - 不會洩漏完整 Hash Key / IV Key

部署後可打開：

```txt
https://你的網域/api/payuni-debug
```

正常正式環境應該看到：

```txt
computedUppAction = https://api.payuni.com.tw/api/upp
```

測試環境則是：

```txt
computedUppAction = https://sandbox-api.payuni.com.tw/api/upp
```

如果看到自己的網站網址，或看到 `/upp/upp`，代表 PAYUNI_API_BASE_URL 填錯。


## PAYUNi ReturnURL 缺 payload 修正

這版修正 PAYUNi ReturnURL 只帶使用者回網站、但沒有附上 `EncryptInfo` / `HashInfo` 時會變成錯誤的問題。

修正內容：

- 建立訂單時，`ReturnURL` / `NotifyURL` 會加上 `orderId`
- `/api/payuni-return` 如果沒有收到 `EncryptInfo` / `HashInfo`，會改用 `orderId` 查詢 `purchase_orders`
- 若訂單已付款，導回 `payuni_success`
- 若訂單尚未付款，導回 `payuni_pending`
- 真正加點仍以 `NotifyURL` 或完整付款 payload 為準，避免誤加點


## 電腦版直接下載修正

這版調整 PNG 輸出邏輯：

- 電腦版：按「下載 / 分享 PNG」會直接下載 PNG，不再開啟系統分享選單
- 手機版：保留分享選單；如果瀏覽器不支援分享，會顯示圖片讓使用者長按儲存


## 電腦版 Blob 直接下載修正

這版再次強化電腦版 PNG 下載：

- 電腦版完全不呼叫 Web Share API
- 改用 Blob URL 下載，比 data URL 更穩
- 手機版仍保留系統分享選單
- `app.js` 版本改為 `desktop-blob-download-2`，避免瀏覽器吃到舊快取


## 電腦下載 JS 修正版

這版修正上一版 `app.js` 殘留舊下載程式碼造成的 JavaScript 語法錯誤。

- 登入 / 註冊恢復正常
- 電腦版維持 Blob 直接下載
- 手機版維持分享選單
- `app.js` 版本更新為 `desktop-download-jsfix-1`


## 電腦下載 Clean 版

這版確認修復上一版造成的 JavaScript 語法問題，並保留：

- 登入 / 註冊功能
- PAYUNi ReturnURL 修正
- 電腦版 Blob 直接下載
- 手機版系統分享選單


## Android 下載修正

這版調整 PNG 輸出邏輯：

- Android：改成直接下載 PNG 到手機下載資料夾
- 電腦版：維持 Blob 直接下載
- iPhone / iPad：維持系統分享選單或長按儲存
- 避免 Android 只開分享選單但無法真正儲存圖片


## Paddle 審核頁面版本

這版新增 Paddle 審核需要的公開頁面：

- `/pricing`
- `/terms`
- `/privacy`
- `/refund`

同時新增首頁 footer 連結與 `vercel.json` clean URLs，讓 Vercel 可以用無副檔名網址開啟頁面。


## 首頁政策按鈕版本

這版在主頁新增明顯的按鈕連結：

- 查看價格方案 → `/pricing`
- 服務條款 → `/terms`
- 隱私權政策 → `/privacy`
- 退款政策 → `/refund`

Footer 原本的文字連結仍保留，方便 Paddle 審核時從首頁找到政策頁。


## 完整 Paddle 審核政策頁版本

這版重寫並補完整四個公開頁面：

- `/pricing`：產品說明、信用點數方案、交付方式、1 credit = 1 generation
- `/terms`：服務條款、帳號與點數、AI 內容、音樂/歌詞權利、付款與退款
- `/privacy`：收集資料、用途、第三方處理者、付款資料、cookie/local storage、資料保留
- `/refund`：未使用點數、已使用點數、重複付款、失敗交付、退款申請方式

注意：頁面中的 `chibubux3@gmail.com` / `chibubux3@gmail.com` 請在提交 Paddle 前改成你真的能收信的信箱。


## 聯絡信箱更新

這版已將政策頁與說明文件中的聯絡信箱統一改為：

```txt
chibubux3@gmail.com
```


## 免費 10 次 + 自由贊助 + IG 私訊購買版

這版調整產品策略：

- 新會員免費生成次數從 3 次改為 10 次
- 「購買生成次數」改成「點數與支持方式」
- 自由贊助與購買點數分開說明
- 贊助不會自動加點
- 額外點數改為私訊 Instagram / 寄信人工確認
- 新增 `supabase/free_10_migration.sql`：可將既有會員低於 10 次的點數補到 10 次

注意：
- `app.js` 裡的 `IG_USERNAME` 目前先設為 `chibubux3`，如果你的 Instagram 帳號不同，請改成正確帳號。
- QR Code 目前是版面佔位，之後可再放入你的實際 QR 圖。


## LINE 贊助 QR + Instagram 更新版

這版已完成：

- 將自由贊助 QR Code 換成使用者提供的 LINE QR Code
- Instagram 私訊帳號改為 `ongaku_x3`
- QR 圖片放在 `assets/line-donation-qr.png`
- 首頁文案改為透過 LINE QR Code 自由贊助


## 定價 + 管理員手動補點版

這版已填入點數定價：

- 回饋包：10 次｜NT$49
- 創作包：30 次｜NT$129
- 大量包：100 次｜NT$299

購買仍為人工確認，使用者會被引導私訊 Instagram `@ongaku_x3` 或寄信。

### 管理員手動補點

新增：

- `/api/admin-add-credits`
- 首頁管理員面板：輸入使用者 Email、增加次數、備註，直接補點

使用前請確認 Vercel 有設定：

```txt
ADMIN_EMAILS=你的管理員登入信箱
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase secret/service role key
```

只有 `ADMIN_EMAILS` 內的管理員登入後才會看到補點面板。

補點成功後會更新：

- `user_credits.remaining_credits`
- `credit_logs` 新增一筆 `manual_add`


## 歌曲存在性檢查版

這版新增「生成前歌曲檢查」：

- 會先用公開音樂資料來源檢查歌手 + 歌名是否能找到
- 若查無此歌曲，會回傳「查無此歌曲」並提供可能相近的歌曲建議
- 查無歌曲時不會扣除生成次數
- 只有通過歌曲存在檢查後才會呼叫 OpenAI 生成內容並扣 1 次
- 產生狀態文字改成「先確認歌曲是否存在；確認後才會扣點並開始分析…」

注意：部分非常冷門、未上架串流平台、同人作品或剛發行歌曲，可能因公開資料來源尚未收錄而被判定查無。


## 模式與尺寸預覽版

這版依需求調整：

- 不新增音源能量曲線，維持原本 AI 生成的「情緒輪廓」
- 「標準分析 / 深層進化 / 導演版」改成卡片式預覽，顯示每個模式差異
- 後端 prompt 加強三種模式差異：
  - 標準分析：清楚、簡潔、好讀
  - 深層進化：心理狀態、場景、物件隱喻更深
  - 導演版：鏡頭、光線、劇照感更強
- 「收據 / 方形 / 限時動態」新增視覺預覽卡
- 方形貼文改成真正 1:1 畫布，使用摘要式方形卡片呈現
- 限時動態改成固定 9:16 畫布比例


## 方形重新排版 + 單一分析模式版

這版調整：

- 不新增音源能量曲線，維持原本 AI「情緒輪廓」
- 移除「標準分析 / 深層進化 / 導演版」選項，改成單一「情緒收據分析」
- 原因：避免模式差異不夠明顯，造成使用者選擇負擔
- 方形貼文不再裁切長收據，也不是單純把長票塞進正方形
- 方形貼文新增獨立的 square layout：
  - 1:1 正方形畫布
  - 重新排版成社群摘要卡
  - 保留歌曲、標語、靈魂摘要、情緒濃度、色彩、情緒輪廓、具現化、結帳摘要
- 收據模式仍保留完整長條小票


## 方形真正重新排版修正版

這版進一步修正方形模式：

- 不再只靠 CSS 隱藏 / 裁切長收據
- 切到方形時，JavaScript 會直接改成獨立的 square DOM 版面
- 方形內容重新排版成 1:1 社群摘要卡，不沿用長條收據 DOM
- 切換「收據 / 方形 / 限時」時會重新渲染目前資料


## Google AdSense 簡潔版

這版已加入使用者提供的 Google AdSense 程式碼：

- 已放入所有 HTML 頁面的 `<head>` 中
- 不新增頁面上的廣告區塊，避免版面變複雜或太亂
- 已新增 `/ads.txt`

如果你在 Google AdSense 後台開啟 Auto ads，Google 會自動判斷廣告位置；如果覺得太干擾，可以在 AdSense 後台降低或關閉 Auto ads 的自動插入位置。


## IG 限時動態模板版

這版新增 IG 限時動態專用輸出：

- 「限時動態」改成「IG 限動」
- 9:16 畫布比例
- 切到 IG 限動時，JS 會產生獨立 story DOM，不沿用長收據，不裁切
- 內容重新排版成適合限動的模板：
  - 標語
  - 靈魂摘要
  - 情緒濃度
  - 情緒輪廓
  - 色彩語言
  - 歌曲具現化
  - 結帳摘要
- 下載檔名會變成 `song-receipt-ig-story-時間.png`
- 手機分享時標題會使用 `Song Receipt IG Story`

注意：網頁不能保證直接發到 Instagram 限動；最穩定做法是下載 PNG 後，在 Instagram 限時動態選取圖片發布。
