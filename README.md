# Easy Radio

Easy Radio 是一個在 iPhone Safari 與電腦瀏覽器播放中廣電台的長輩友善靜態網站。

播放器包含保守的受控斷線恢復：短暫緩衝會先交由瀏覽器自行恢復，持續失敗才逐步延長間隔重新連線。
使用者主動暫停後，系統會取消所有重連安排，不會自行恢復播放。

## Version 與 Build

Version 代表產品版本，由 Project Owner 決定。

Build 代表 GitHub Pages 部署次數，每次正式 Commit + Push 都會增加。

目前的 Version 與 Build Number 集中保存在 `version.js`。除非 Project Owner 明確要求升版，否則 Version 保持不變；每次完成一輪修改並準備正式部署時才將 Build Number 加 1，未 Push 的修改不算新 Build。現在是 `Version v0.3`、`Build 001`。

## 檔案

- `index.html`：網頁的結構與內容
- `version.js`：產品 Version 與部署 Build Number
- `style.css`：畫面外觀與橫直式排版
- `script.js`：播放按鈕、狀態與日期時間
- `stations-data.js`：已確認的電台與串流資料
- `station-search.js`：本機電台搜尋
- `station-menu.js`：電台選單與切換互動

## 電台選單

按頁面上方的「電台」即可開啟選單，輸入文字後會立即搜尋電台名稱、副標題、頻率與關鍵字。目前收錄：

- 中廣音樂網 i Radio FM96.3
- 中廣流行網 i like radio FM103.3

新增電台時，請在 `stations-data.js` 的 `stations` 陣列加入一筆物件，填入唯一的 `id`、`name`、`brand`、`streamUrl`，並可加入 `subtitle`、`frequency` 與 `keywords`。`streamUrl` 必須是已確認可播放的 HTTPS 正式入口；不得填入猜測、第三方、HTTP 或 redirect 後含 `rj-tok`／`rj-ttl` 的短效網址。

使用者正在播放時切換電台，播放器會使用同一個 `<audio>` 元素嘗試繼續播放；使用者已暫停時切換電台，仍會維持暫停。點選目前電台只會關閉選單，不會重新載入串流。

## 本機快速測試

直接打開 `index.html` 可以預覽畫面，但部分瀏覽器對本機檔案的串流播放有限制。
最可靠的測試方式是部署至 GitHub Pages。

## Radio Player Pages

`https://caboboo.github.io/easy-radio/`

## 音量控制

- 電腦瀏覽器可使用音量滑桿及「靜音／恢復音量」按鈕。
- 預設音量為 100%，滑桿會直接設定現有 `<audio>` 元素的音量。
- 靜音後恢復時，會回到靜音前的音量。
- iPhone／iPad 不顯示網頁音量控制，音量仍由裝置側邊按鍵調整。

## 電腦測試

1. 確認初始音量為 100%
2. 調整滑桿並確認音量百分比與實際音量
3. 測試靜音後恢復至原本音量
4. 將滑桿移至 0，再移回大於 0

## iPhone／iPad 測試

1. 使用 Safari 開啟網址
2. 確認不顯示網頁音量控制或音量提示
3. 按一次「播放」
4. 測試橫放與直放
5. 測試實體音量鍵與藍牙喇叭
6. 測試連續播放至少 30 分鐘
7. 測試鎖定螢幕後是否持續播放

## 注意

- iPhone Safari 通常不允許網頁首次開啟便自動播放有聲音，需由使用者按一次播放。
- 部分瀏覽器在斷線或背景播放後，可能要求使用者再次按下「播放」才能繼續收聽。
- iPhone／Safari 的鎖定螢幕與背景播放仍受 iOS 及瀏覽器限制，無法保證全天候不中斷。
- 電台串流來源及使用者網路的穩定度不在 Easy Radio 的控制範圍內。
- 目前曲目文字尚未串接，因為還需要確認中廣是否提供可公開使用的即時曲目資料。
- v0.1 使用目前可查到的直播串流網址；正式長期使用前，仍應確認中廣對第三方播放器嵌入的授權條件。
