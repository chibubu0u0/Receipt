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
