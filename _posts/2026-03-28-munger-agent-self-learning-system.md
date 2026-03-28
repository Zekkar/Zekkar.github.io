---
title: "打造會自我學習的交易分析系統：從查理芒格到動態 Agent 架構"
date: 2026-03-28 08:00:00
categories:
  - 技術
tags:
  - AI
  - Agent
  - LLM
  - 交易系統
  - 查理芒格
excerpt: "如何讓交易分析系統像查理芒格那樣，根據事件性質自主選擇分析工具、從預測結果中學習、並透過持久化機制不斷改進。"
toc: true
toc_sticky: true
---

## 前言

查理芒格最著名的投資哲學不是「買什麼」，而是**「怎麼想」**。他的多學科思維模型（Lattice of Mental Models）強調：根據問題的性質，選擇最適合的心智模型來分析。

我嘗試把這個哲學實作成一套自動化的交易分析系統。這篇文章記錄了從**固定管線到動態 Agent** 的演化過程，以及系統如何透過收集數據實現自我學習。

---

## 系統全景：從數據到決策

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" style="width:100%;height:auto;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="ms"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.15"/></filter>
    <linearGradient id="mg1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#667eea"/><stop offset="100%" stop-color="#764ba2"/></linearGradient>
    <linearGradient id="mg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f093fb"/><stop offset="100%" stop-color="#f5576c"/></linearGradient>
    <linearGradient id="mg3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4facfe"/><stop offset="100%" stop-color="#00f2fe"/></linearGradient>
    <linearGradient id="mg4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#43e97b"/><stop offset="100%" stop-color="#38f9d7"/></linearGradient>
    <linearGradient id="mg5" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fa709a"/><stop offset="100%" stop-color="#fee140"/></linearGradient>
    <marker id="ma" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#555"/></marker>
    <marker id="mal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#f093fb"/></marker>
  </defs>
  <rect width="800" height="480" rx="12" fill="#1e1e2e"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#e0e0e0">芒格系統：從數據收集到自我學習</text>
  <!-- Layer 1: Data Sources -->
  <text x="20" y="60" font-size="13" font-weight="bold" fill="#4facfe">數據攝入層（13 個來源）</text>
  <g filter="url(#ms)"><rect x="15" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="60" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">RSS 新聞</text><text x="60" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">每小時掃描</text></g>
  <g filter="url(#ms)"><rect x="113" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="158" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">FRED API</text><text x="158" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">M2/Fed BS/OAS</text></g>
  <g filter="url(#ms)"><rect x="211" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="256" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">COT 報告</text><text x="256" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">每週 CFTC</text></g>
  <g filter="url(#ms)"><rect x="309" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="354" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">殖利率曲線</text><text x="354" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">即時 Regime</text></g>
  <g filter="url(#ms)"><rect x="407" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="452" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">VIX 結構</text><text x="452" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">Contango</text></g>
  <g filter="url(#ms)"><rect x="505" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="550" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">經濟日曆</text><text x="550" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">CPI/NFP/FOMC</text></g>
  <g filter="url(#ms)"><rect x="603" y="70" width="90" height="50" rx="8" fill="url(#mg1)"/><text x="648" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">國債拍賣</text><text x="648" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">Bid-to-Cover</text></g>
  <g filter="url(#ms)"><rect x="701" y="70" width="85" height="50" rx="8" fill="url(#mg1)"/><text x="743" y="93" text-anchor="middle" font-size="11" font-weight="bold" fill="white">流動性</text><text x="743" y="108" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">9 成分</text></g>
  <!-- Arrow down -->
  <line x1="400" y1="120" x2="400" y2="140" stroke="#555" stroke-width="2" marker-end="url(#ma)"/>
  <!-- Layer 2: Agent -->
  <g filter="url(#ms)"><rect x="150" y="148" width="500" height="100" rx="12" fill="#2a2a3e" stroke="#f093fb" stroke-width="1.5"/>
    <text x="400" y="172" text-anchor="middle" font-size="16" font-weight="bold" fill="#f093fb">MungerAgent — 動態分析引擎</text>
    <text x="400" y="195" text-anchor="middle" font-size="12" fill="#ccc">Router LLM（查理芒格角色）根據事件性質自主選擇工具和推理路徑</text>
    <rect x="170" y="210" width="65" height="25" rx="5" fill="rgba(79,172,254,0.15)"/><text x="202" y="227" text-anchor="middle" font-size="9" fill="#4facfe">殖利率</text>
    <rect x="243" y="210" width="65" height="25" rx="5" fill="rgba(79,172,254,0.15)"/><text x="275" y="227" text-anchor="middle" font-size="9" fill="#4facfe">流動性</text>
    <rect x="316" y="210" width="50" height="25" rx="5" fill="rgba(79,172,254,0.15)"/><text x="341" y="227" text-anchor="middle" font-size="9" fill="#4facfe">COT</text>
    <rect x="374" y="210" width="65" height="25" rx="5" fill="rgba(79,172,254,0.15)"/><text x="406" y="227" text-anchor="middle" font-size="9" fill="#4facfe">知識庫</text>
    <rect x="447" y="210" width="65" height="25" rx="5" fill="rgba(79,172,254,0.15)"/><text x="479" y="227" text-anchor="middle" font-size="9" fill="#4facfe">因果鏈</text>
    <rect x="520" y="210" width="55" height="25" rx="5" fill="rgba(245,87,108,0.15)"/><text x="547" y="227" text-anchor="middle" font-size="9" fill="#f5576c">LLM</text>
    <rect x="583" y="210" width="55" height="25" rx="5" fill="rgba(245,87,108,0.15)"/><text x="610" y="227" text-anchor="middle" font-size="9" fill="#f5576c">注意力</text>
  </g>
  <!-- Arrow down -->
  <line x1="400" y1="248" x2="400" y2="268" stroke="#555" stroke-width="2" marker-end="url(#ma)"/>
  <!-- Layer 3: Output -->
  <g filter="url(#ms)"><rect x="100" y="275" width="600" height="55" rx="10" fill="url(#mg4)" opacity="0.9"/>
    <text x="400" y="300" text-anchor="middle" font-size="15" font-weight="bold" fill="#1a1a2e">8 資產方向預測 + 信心度 + 反向思考</text>
    <text x="400" y="318" text-anchor="middle" font-size="11" fill="rgba(0,0,0,0.5)">ZB · ZN · ES · NQ · CL · GC · DX · VIX</text>
  </g>
  <!-- Arrow down -->
  <line x1="400" y1="330" x2="400" y2="350" stroke="#555" stroke-width="2" marker-end="url(#ma)"/>
  <!-- Layer 4: Learning Loop -->
  <g filter="url(#ms)"><rect x="50" y="358" width="700" height="100" rx="12" fill="#2a2a3e" stroke="#fa709a" stroke-width="1.5"/>
    <text x="400" y="382" text-anchor="middle" font-size="15" font-weight="bold" fill="#fa709a">自我學習閉環</text>
    <rect x="75" y="395" width="130" height="45" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/><text x="140" y="415" text-anchor="middle" font-size="11" font-weight="bold" fill="#4facfe">反應追蹤</text><text x="140" y="432" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.5)">8 資產 1h/4h/24h</text>
    <rect x="220" y="395" width="130" height="45" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/><text x="285" y="415" text-anchor="middle" font-size="11" font-weight="bold" fill="#f093fb">週回顧分析</text><text x="285" y="432" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.5)">LLM 失敗模式</text>
    <rect x="365" y="395" width="130" height="45" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/><text x="430" y="415" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffa94d">自動調權</text><text x="430" y="432" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.5)">14 天滑動窗口</text>
    <rect x="510" y="395" width="130" height="45" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/><text x="575" y="415" text-anchor="middle" font-size="11" font-weight="bold" fill="#43e97b">知識累積</text><text x="575" y="432" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.5)">validated/deprecated</text>
  </g>
  <!-- Learning loop arrow back -->
  <path d="M750,408 C780,408 780,195 650,195" stroke="#f093fb" stroke-width="1.5" fill="none" stroke-dasharray="5,3" marker-end="url(#mal)"/>
  <text x="785" y="300" text-anchor="middle" font-size="10" fill="#f093fb" transform="rotate(90,785,300)">學習回饋</text>
</svg>

---

## 為什麼需要自我學習？

傳統的規則型分析系統有一個根本問題：**規則是人寫的，但市場是動態的。**

| 問題 | 傳統系統 | 自我學習系統 |
|------|---------|-------------|
| CPI 超預期 | 固定權重反應 | 根據歷史「市場真的在意嗎？」動態調整 |
| 同一新聞報導 10 次 | 每次都觸發分析 | 聚類去重，判斷是否已 price-in |
| 預測連續錯誤 | 繼續用同樣邏輯 | 自動降低該來源權重 |
| 新的市場模式 | 等人手動更新規則 | 從失敗案例自動生成知識條目 |

---

## 數據收集：13 個外在因素

芒格的多學科思維強調**從不同角度看同一個問題**。系統收集 13 種不同類型的數據：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" style="width:100%;height:auto;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="ds"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.15"/></filter>
  </defs>
  <rect width="800" height="300" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="#e0e0e0">外在因素覆蓋範圍</text>
  <!-- Row 1: Monetary -->
  <text x="20" y="58" font-size="12" font-weight="bold" fill="#4facfe">貨幣與流動性</text>
  <g filter="url(#ds)"><rect x="15" y="68" width="115" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="72" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">M2 貨幣供給</text><text x="72" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">FRED · 年增率</text></g>
  <g filter="url(#ds)"><rect x="138" y="68" width="115" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="195" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">Fed 資產負債表</text><text x="195" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">FRED · 週環比</text></g>
  <g filter="url(#ds)"><rect x="261" y="68" width="115" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="318" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">逆回購 RRP</text><text x="318" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">NY Fed · 每日</text></g>
  <g filter="url(#ds)"><rect x="384" y="68" width="115" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="441" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">信用利差 OAS</text><text x="441" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">FRED · HY</text></g>
  <g filter="url(#ds)"><rect x="507" y="68" width="115" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="564" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">金融狀況 NFCI</text><text x="564" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">Chicago Fed</text></g>
  <g filter="url(#ds)"><rect x="630" y="68" width="75" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="667" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">TGA</text><text x="667" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">財政帳戶</text></g>
  <g filter="url(#ds)"><rect x="713" y="68" width="75" height="42" rx="6" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.3)"/><text x="750" y="87" text-anchor="middle" font-size="11" fill="#4facfe" font-weight="bold">實質利率</text><text x="750" y="102" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">TIPS+BEI</text></g>
  <!-- Row 2: Market -->
  <text x="20" y="135" font-size="12" font-weight="bold" fill="#43e97b">市場結構</text>
  <g filter="url(#ds)"><rect x="15" y="145" width="115" height="42" rx="6" fill="rgba(67,233,123,0.12)" stroke="rgba(67,233,123,0.3)"/><text x="72" y="164" text-anchor="middle" font-size="11" fill="#43e97b" font-weight="bold">殖利率曲線</text><text x="72" y="179" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">2Y/10Y/30Y Regime</text></g>
  <g filter="url(#ds)"><rect x="138" y="145" width="115" height="42" rx="6" fill="rgba(67,233,123,0.12)" stroke="rgba(67,233,123,0.3)"/><text x="195" y="164" text-anchor="middle" font-size="11" fill="#43e97b" font-weight="bold">VIX 期限結構</text><text x="195" y="179" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">Contango/Backw</text></g>
  <g filter="url(#ds)"><rect x="261" y="145" width="115" height="42" rx="6" fill="rgba(67,233,123,0.12)" stroke="rgba(67,233,123,0.3)"/><text x="318" y="164" text-anchor="middle" font-size="11" fill="#43e97b" font-weight="bold">COT 持倉</text><text x="318" y="179" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">CFTC 52 週百分位</text></g>
  <!-- Row 3: Events -->
  <text x="20" y="212" font-size="12" font-weight="bold" fill="#fa709a">事件驅動</text>
  <g filter="url(#ds)"><rect x="15" y="222" width="115" height="42" rx="6" fill="rgba(250,112,154,0.12)" stroke="rgba(250,112,154,0.3)"/><text x="72" y="241" text-anchor="middle" font-size="11" fill="#fa709a" font-weight="bold">經濟日曆</text><text x="72" y="256" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">CPI/NFP/FOMC/GDP</text></g>
  <g filter="url(#ds)"><rect x="138" y="222" width="115" height="42" rx="6" fill="rgba(250,112,154,0.12)" stroke="rgba(250,112,154,0.3)"/><text x="195" y="241" text-anchor="middle" font-size="11" fill="#fa709a" font-weight="bold">國債拍賣</text><text x="195" y="256" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">Bid-to-Cover 分析</text></g>
  <g filter="url(#ds)"><rect x="261" y="222" width="115" height="42" rx="6" fill="rgba(250,112,154,0.12)" stroke="rgba(250,112,154,0.3)"/><text x="318" y="241" text-anchor="middle" font-size="11" fill="#fa709a" font-weight="bold">RSS 新聞</text><text x="318" y="256" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">三層關鍵詞過濾</text></g>
  <!-- Summary -->
  <rect x="430" y="145" width="355" height="120" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
  <text x="607" y="172" text-anchor="middle" font-size="13" font-weight="bold" fill="#e0e0e0">流動性 Regime 公式</text>
  <text x="607" y="196" text-anchor="middle" font-size="12" fill="#ffa94d">final = event_layer x dampener(liq) + push(liq)</text>
  <text x="607" y="220" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.5)">dampener: 緊縮時壓縮事件信號（好消息也沒用）</text>
  <text x="607" y="238" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.5)">push: 流動性對各資產的直接方向性推力</text>
  <text x="607" y="256" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.5)">Per-Asset Beta: NQ +0.50 / ZB -0.25 / VIX -0.45</text>
</svg>

這 9 個流動性成分被綜合成一個**流動性評分**，透過兩個獨立機制影響最終的資產評分：

1. **Regime Dampener**：流動性環境壓縮/放大事件信號（緊縮環境下，好消息的效果會被壓縮）
2. **Liquidity Push**：流動性對各資產的直接方向性推力（每個資產有不同的 Beta）

---

## 動態 Agent：像芒格一樣思考

### 固定管線 vs 動態 Agent

舊系統是固定管線：不管什麼事件，都走 `新聞 → LLM → 共識 → 評分` 的路線。就像一個只會用錘子的人，看什麼都像釘子。

新的 Agent 架構讓 Router LLM 扮演查理芒格的角色，**根據事件性質自主決定分析路徑**：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 250" style="width:100%;height:auto;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="es"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.15"/></filter>
    <marker id="ea" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#555"/></marker>
  </defs>
  <rect width="800" height="250" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="#e0e0e0">Agent 如何決定分析路徑</text>
  <!-- Example 1: FOMC -->
  <g filter="url(#es)"><rect x="15" y="50" width="120" height="45" rx="8" fill="url(#mg2)"/><text x="75" y="70" text-anchor="middle" font-size="12" font-weight="bold" fill="white">FOMC 聲明</text><text x="75" y="87" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">Fed 利率決議</text></g>
  <line x1="135" y1="72" x2="155" y2="72" stroke="#555" stroke-width="1.5" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="160" y="50" width="80" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="200" y="73" text-anchor="middle" font-size="10" fill="#4facfe">殖利率曲線</text></g>
  <line x1="240" y1="67" x2="255" y2="67" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="260" y="50" width="70" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="295" y="73" text-anchor="middle" font-size="10" fill="#4facfe">COT</text></g>
  <line x1="330" y1="67" x2="345" y2="67" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="350" y="50" width="70" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="385" y="73" text-anchor="middle" font-size="10" fill="#4facfe">知識庫</text></g>
  <line x1="420" y1="67" x2="435" y2="67" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="440" y="50" width="80" height="35" rx="6" fill="rgba(245,87,108,0.15)"/><text x="480" y="73" text-anchor="middle" font-size="10" fill="#f5576c">深度 LLM</text></g>
  <line x1="520" y1="67" x2="540" y2="67" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="545" y="50" width="100" height="35" rx="6" fill="rgba(67,233,123,0.15)" stroke="#43e97b"/><text x="595" y="73" text-anchor="middle" font-size="10" fill="#43e97b">ZB bearish -7</text></g>
  <text x="690" y="73" font-size="11" fill="#888">← 4 輪推理</text>
  <!-- Example 2: Geopolitical -->
  <g filter="url(#es)"><rect x="15" y="110" width="120" height="45" rx="8" fill="url(#mg5)"/><text x="75" y="130" text-anchor="middle" font-size="12" font-weight="bold" fill="white">地緣衝突</text><text x="75" y="147" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">中東緊張升溫</text></g>
  <line x1="135" y1="132" x2="155" y2="132" stroke="#555" stroke-width="1.5" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="160" y="110" width="80" height="35" rx="6" fill="rgba(250,112,154,0.15)"/><text x="200" y="133" text-anchor="middle" font-size="10" fill="#fa709a">注意力信號</text></g>
  <line x1="240" y1="127" x2="255" y2="127" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="260" y="110" width="70" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="295" y="133" text-anchor="middle" font-size="10" fill="#4facfe">因果鏈</text></g>
  <line x1="330" y1="127" x2="345" y2="127" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="350" y="110" width="80" height="35" rx="6" fill="rgba(245,87,108,0.15)"/><text x="390" y="133" text-anchor="middle" font-size="10" fill="#f5576c">深度 LLM</text></g>
  <line x1="430" y1="127" x2="450" y2="127" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="455" y="110" width="115" height="35" rx="6" fill="rgba(67,233,123,0.15)" stroke="#43e97b"/><text x="512" y="133" text-anchor="middle" font-size="10" fill="#43e97b">CL bullish +8</text></g>
  <text x="615" y="133" font-size="11" fill="#888">← 3 輪推理</text>
  <!-- Example 3: Economic -->
  <g filter="url(#es)"><rect x="15" y="170" width="120" height="45" rx="8" fill="url(#mg3)"/><text x="75" y="190" text-anchor="middle" font-size="12" font-weight="bold" fill="white">CPI 超預期</text><text x="75" y="207" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">通膨數據公布</text></g>
  <line x1="135" y1="192" x2="155" y2="192" stroke="#555" stroke-width="1.5" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="160" y="170" width="80" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="200" y="193" text-anchor="middle" font-size="10" fill="#4facfe">Price-In</text></g>
  <line x1="240" y1="187" x2="255" y2="187" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="260" y="170" width="80" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="300" y="193" text-anchor="middle" font-size="10" fill="#4facfe">經濟日曆</text></g>
  <line x1="340" y1="187" x2="355" y2="187" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="360" y="170" width="80" height="35" rx="6" fill="rgba(79,172,254,0.15)"/><text x="400" y="193" text-anchor="middle" font-size="10" fill="#4facfe">流動性</text></g>
  <line x1="440" y1="187" x2="455" y2="187" stroke="#555" stroke-width="1" marker-end="url(#ea)"/>
  <g filter="url(#es)"><rect x="460" y="170" width="115" height="35" rx="6" fill="rgba(67,233,123,0.15)" stroke="#43e97b"/><text x="517" y="193" text-anchor="middle" font-size="10" fill="#43e97b">ES bearish -5</text></g>
  <text x="620" y="193" font-size="11" fill="#888">← 3 輪推理</text>
  <!-- Note -->
  <text x="400" y="238" text-anchor="middle" font-size="11" fill="#888">不同事件 → 不同工具組合 → 不同推理深度</text>
</svg>

關鍵差異：**路徑是問題決定的，不是程式碼決定的。** FOMC 聲明需要查殖利率和 COT，地緣衝突需要查因果鏈和注意力信號。Agent 自主決定。

---

## 四個學習閉環

### 閉環 1：反應追蹤 → 準確率統計

LLM 每次分析後，對 8 個資產啟動獨立追蹤：

| 檢查點 | 時機 | 判斷方式 |
|--------|------|---------|
| 1h | 分析後 1 小時 | 延遲報價方向 vs 預測方向 |
| 4h | 分析後 4 小時 | 同上 |
| 24h | 分析後 24 小時 | 同上，最終結算 |

每 30 分鐘從 IB 記錄 8 資產延遲報價，用於比對預測。累積的準確率資料驅動後續的自動調權。

### 閉環 2：週回顧 → 知識生成

每週一自動觸發 LLM 回顧分析：

1. 收集過去一週所有已完成的市場反應追蹤
2. 統計各來源（經濟日曆 / Fed 政策 / 新聞場景）的準確率
3. 識別失敗模式（哪些類型的事件預測最差？）
4. 自動生成知識條目寫入知識庫
5. 下次分析時，相關知識會被注入 LLM Prompt

### 閉環 3：自動調權

基於 14 天滑動窗口的準確率，自動調整各來源的權重：

| 條件 | 動作 | 限制 |
|------|------|------|
| 準確率 > 75% | SOURCE_AMPLIFIERS +5% | 單次最大 ±5% |
| 準確率 < 40% | SOURCE_AMPLIFIERS -5% | 累計最大 ±30% |

**關鍵改進**：調整後的權重存入 DB，重啟服務後從 DB 載入。不再像過去一樣重啟歸零。

### 閉環 4：知識反饋閉環

每次 LLM 分析時，Prompt 會注入相關的歷史知識。LLM 回傳時會標記每條知識是否仍然適用：

| 狀態 | 觸發條件 | 效果 |
|------|---------|------|
| `validated` | 知識與當前分析一致 | 累計 ≥ 5 次 → 升級為 trusted |
| `contradicted` | 知識與當前分析矛盾 | 累計 ≥ 3 次 → 降級為 deprecated |
| `irrelevant` | 知識與當前事件無關 | 不計數 |

---

## 新聞注意力信號

同一主題在一天內被多次報導，有兩種可能：**真正重大事件**或**媒體炒作**。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 180" style="width:100%;height:auto;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="ns"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.15"/></filter>
  </defs>
  <rect width="800" height="180" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="#e0e0e0">新聞注意力分級</text>
  <g filter="url(#ns)"><rect x="15" y="48" width="180" height="55" rx="8" fill="rgba(67,233,123,0.12)" stroke="rgba(67,233,123,0.4)"/><text x="105" y="72" text-anchor="middle" font-size="14" font-weight="bold" fill="#43e97b">Normal</text><text x="105" y="92" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">1 篇 → 正常分析</text></g>
  <g filter="url(#ns)"><rect x="210" y="48" width="180" height="55" rx="8" fill="rgba(255,169,77,0.12)" stroke="rgba(255,169,77,0.4)"/><text x="300" y="72" text-anchor="middle" font-size="14" font-weight="bold" fill="#ffa94d">High</text><text x="300" y="92" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">3+ 篇多來源 → 觸發分析</text></g>
  <g filter="url(#ns)"><rect x="405" y="48" width="180" height="55" rx="8" fill="rgba(245,87,108,0.12)" stroke="rgba(245,87,108,0.4)"/><text x="495" y="72" text-anchor="middle" font-size="14" font-weight="bold" fill="#f5576c">Saturated</text><text x="495" y="92" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">10+ 篇 → 可能已 price-in</text></g>
  <g filter="url(#ns)"><rect x="600" y="48" width="185" height="55" rx="8" fill="rgba(79,172,254,0.12)" stroke="rgba(79,172,254,0.4)"/><text x="692" y="72" text-anchor="middle" font-size="14" font-weight="bold" fill="#4facfe">市場驗證</text><text x="692" y="92" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">比對同時段價格波動</text></g>
  <rect x="15" y="118" width="770" height="45" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
  <text x="400" y="140" text-anchor="middle" font-size="12" fill="#e0e0e0">區分「真正重大」和「媒體炒作」的方法不是看新聞本身，而是看 <tspan fill="#ffa94d" font-weight="bold">市場是否在動</tspan></text>
  <text x="400" y="157" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.4)">Agent 呼叫 check_market_attention 工具 → 比對 8 資產波動率 → 判斷 amplify / dampen / ignore</text>
</svg>

---

## 目前已實現 vs 未來展望

### 已實現

| 能力 | 狀態 | 說明 |
|------|:----:|------|
| 13 個數據來源收集 | ✅ | FRED / COT / RSS / 殖利率 / VIX / 經濟日曆 |
| 動態 Agent 分析 | ✅ | Router LLM + 10 工具 + 最多 5 輪推理 |
| 流動性 Regime | ✅ | 9 成分評分 + Dampener + Per-Asset Beta |
| 因果鏈傳導 | ✅ | BFS 5 層深度 + 153 個節點 |
| 多引擎共識 | ✅ | N 引擎投票（Gemini / Claude / Groq） |
| 調權持久化 | ✅ | 16 個權重存入 DB，重啟後不歸零 |
| 8 資產反應追蹤 | ✅ | 30 分鐘延遲報價 + 1h/4h/24h 驗證 |
| 知識反饋閉環 | ✅ | validated ≥ 5 → trusted / contradicted ≥ 3 → deprecated |
| 新聞注意力信號 | ✅ | 聚類去重 + 市場波動比對 |
| Agent fallback | ✅ | Router 失敗時自動切換傳統管線 |

### 未來展望

| 方向 | 優先級 | 說明 |
|------|:------:|------|
| **跨分析記憶** | 高 | Agent 能看到「上次同類事件的判斷和結果」 |
| **Router Prompt 演化** | 高 | 週回顧自動分析工具使用模式，生成直覺補充 |
| **A/B 比對驗證** | 高 | 前 30 天同時運行 Agent + 傳統管線，比對準確率 |
| Put/Call Ratio | 中 | 選擇權市場情緒指標 |
| 非美央行政策 | 中 | ECB / BOJ 獨立資料源 |
| 信貸市場 | 低 | IG 利差 / CLO / 商業不動產 |
| 投資者情緒 | 低 | AAII 調查 / Conference Board |
| 地緣政治指數 | 低 | GPR Index 量化指標 |
| LangGraph 遷移 | 備案 | 需要 streaming / human-in-the-loop 時 |

---

## 期望達成的目標

### 短期目標（1-3 個月）

1. **Agent 準確率 > 傳統管線** — 透過 A/B 比對驗證
2. **知識庫品質穩定** — trusted 條目 > 50%，deprecated 自動清除
3. **調權收斂** — 各來源權重在合理範圍內穩定

### 中期目標（3-6 個月）

1. **跨分析記憶成熟** — Agent 能引用「上次 FOMC 的判斷」
2. **Router Prompt 自我演化** — 工具選擇直覺隨時間改善
3. **覆蓋非美市場** — ECB / BOJ 政策納入分析

### 長期願景

> 一個能像查理芒格那樣思考的系統：不是知道最多，而是**知道什麼時候該用什麼**。根據問題的性質選擇最適合的分析工具，從每次預測的結果中學習，持續改進自己的判斷品質。

這不是要取代人的判斷，而是建立一個**有經驗的分析助手** — 它記得過去的錯誤、知道自己的能力邊界、在不確定時會主動告訴你「這次超出我的能力範圍」。

---

## 技術架構摘要

系統採用混合架構 — 現有 API / 排程 / 前端不動，核心分析引擎替換為 Agent 模組：

| 元件 | 技術 |
|------|------|
| Agent Core | 自建 StateGraph（~300 行 Python） |
| Router LLM | Claude（可配置切換 Gemini / Groq） |
| 工具數量 | 10 個（可擴展，新增只需建檔 + 註冊） |
| 後端 | FastAPI + SQLAlchemy + PostgreSQL |
| 排程 | APScheduler（每小時新聞掃描 / 每日流動性 / 每週 COT） |
| 部署 | Docker Compose → VM (192.168.50.194) |
| 通知 | Telegram MCP + EventBus |

完整設計文件：[docs/superpowers/specs/2026-03-28-munger-agent-upgrade-design.md](https://github.com/Zekkar/ibapi-trading)
