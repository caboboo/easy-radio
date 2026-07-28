# 阿爸專用網路廣播機 v0.1

第一個 Milestone：在 iPhone Safari / GitHub Pages 上播放「中廣音樂網 i Radio FM96.3」。

## 檔案

- `index.html`：網頁的結構與內容
- `style.css`：畫面外觀與橫直式排版
- `script.js`：播放按鈕、狀態與日期時間

## 本機快速測試

直接打開 `index.html` 可以預覽畫面，但部分瀏覽器對本機檔案的串流播放有限制。
最可靠的測試方式是部署至 GitHub Pages。

## GitHub Pages

`https://catontsai.github.io/papa-radio/`

## iPhone 測試

1. 使用 Safari 開啟網址
2. 按一次「播放」
3. 測試橫放與直放
4. 測試藍牙喇叭
5. 測試連續播放至少 30 分鐘
6. 測試鎖定螢幕後是否持續播放

## 注意

- iPhone Safari 通常不允許網頁首次開啟便自動播放有聲音，需由使用者按一次播放。
- 目前曲目文字尚未串接，因為還需要確認中廣是否提供可公開使用的即時曲目資料。
- v0.1 使用目前可查到的直播串流網址；正式長期使用前，仍應確認中廣對第三方播放器嵌入的授權條件。
