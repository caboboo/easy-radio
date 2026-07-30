# Easy Radio 開發規範

## Version 與 Build

- `Version` 是產品版本，只能由 Project Owner 決定。
- 除非使用者明確要求升級到指定版本（例如「升級到 v0.4」），否則不得修改 `Version`。
- 一般功能、修正、文件或樣式修改都只能增加 `Build`，不得以 `v0.3.1`、`v0.3.2` 等形式變更產品版本。
- `version.js` 是 Version 與 Build Number 的唯一資料來源。
- 畫面必須分開顯示 `Version v0.3` 與三位數格式的 `Build 001`，不得合併顯示為 `v0.3.1`。

## 正式部署流程

每次完成修改並準備正式 Commit 與 Push 至 GitHub Pages 前：

1. 讀取 `version.js` 目前的 Build Number。
2. 將 Build Number 加 1；Version 保持不變，除非 Project Owner 明確要求升版。
3. 確認畫面顯示的 Version 與三位數 Build 正確。
4. 執行相關測試。
5. Commit。
6. Push。

未進行正式 Commit 與 Push 時，不得為了草稿、檢查或測試重複增加 Build。
