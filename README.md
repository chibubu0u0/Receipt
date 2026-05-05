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
