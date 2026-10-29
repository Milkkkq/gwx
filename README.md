# 腦波同步局｜三人即時聯機版

Node.js + Express + Socket.IO 即時多人遊戲，房間狀態由伺服器同步，支援三台手機使用同一網址遊玩。

## 本機啟動
需要 Node.js 18 或更新版本。

```bash
npm install
npm start
```

開啟 http://localhost:3000。要讓其他手機加入，需部署到公開服務，不能使用手機自己的 localhost。

## 部署到 Render
1. 在 Render 建立 Web Service，連接此 GitHub 倉庫。
2. Build Command 填 `npm install`。
3. Start Command 填 `npm start`。
4. 部署成功後，用 Render 提供的 HTTPS 網址讓三位玩家開啟。

## 遊戲規則
三位玩家各自提交中英文聯想詞，全部提交後揭曉並投票。內建中英同義詞表命中，或三人全部投同意票，遊戲結束並隨機生成夸夸；否則三人都準備後進入下一輪。

## 限制
語義判斷目前是精確詞語及小型中英同義詞表，不是完整 AI 語義理解。房間暫存在伺服器記憶體，服務重啟後會清空。健康檢查端點為 /health。
