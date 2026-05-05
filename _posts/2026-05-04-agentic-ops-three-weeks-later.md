---
title: "三週後的 Harness：從工程方法論到 AgenticOps"
date: 2026-05-04
categories:
  - 技術
tags:
  - AI
  - Claude Code
  - Harness Engineering
  - AgenticOps
  - 自我修復
  - 可觀測性
excerpt: "三週前我寫了一篇關於 Harness Engineering 的文章，描述了五層架構和幾個未來計畫。今天回頭對照，有三件事已經落地、有一件事比當初想像的走得更遠，以及一個當初根本沒預見到的新模式。"
toc: true
toc_sticky: true
---

三週前我發表了《Harness Engineering 方法論：從 CLAUDE.md 到自進化的 AI 開發體系》，整理了我的五層架構。

文章最後列了幾個「仍在演進」的方向：Knowledge Graph MCP、自主部署驗證回滾、SBE 深化、多 Agent 協作。

今天（2026-05-04）是一個觀察自己進步的好時機。

---

## AgenticOps：四階段持續循環

AgenticOps 的核心是一個永不停止的四階段閉環——每一輪循環結束後，系統比上一輪更聰明、更可靠。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" style="max-width:700px;width:100%;font-family:'Segoe UI',Arial,sans-serif">
  <defs>
    <marker id="ah" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker>
  </defs>
  <!-- bg -->
  <rect width="700" height="420" fill="#f8fafc" rx="16"/>
  <!-- center circle -->
  <circle cx="350" cy="210" r="72" fill="#1e293b" opacity=".07"/>
  <circle cx="350" cy="210" r="60" fill="#1e293b" opacity=".12"/>
  <text x="350" y="204" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">Agentic</text>
  <text x="350" y="222" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">Ops</text>
  <!-- TOP: 計畫 -->
  <rect x="240" y="18" width="220" height="78" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
  <text x="350" y="47" text-anchor="middle" font-size="14" font-weight="700" fill="#1d4ed8">① 計畫 Planning</text>
  <text x="350" y="65" text-anchor="middle" font-size="12" fill="#3b82f6">SBE 需求 · 知識庫查詢</text>
  <text x="350" y="81" text-anchor="middle" font-size="11" fill="#6b7280">假設審計 → 確認影響範圍</text>
  <!-- RIGHT: 開發 -->
  <rect x="530" y="160" width="155" height="100" rx="14" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="607" y="192" text-anchor="middle" font-size="14" font-weight="700" fill="#6d28d9">② 開發</text>
  <text x="607" y="210" text-anchor="middle" font-size="12" fill="#8b5cf6">Harness + AI</text>
  <text x="607" y="227" text-anchor="middle" font-size="11" fill="#6b7280">自我驗證·修復·再驗證</text>
  <text x="607" y="243" text-anchor="middle" font-size="11" fill="#6b7280">並行 Subagent 協作</text>
  <!-- BOTTOM: 驗證 -->
  <rect x="240" y="320" width="220" height="78" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="350" y="350" text-anchor="middle" font-size="14" font-weight="700" fill="#065f46">③ 驗證 Verify</text>
  <text x="350" y="368" text-anchor="middle" font-size="12" fill="#10b981">E2E · 部署健康檢查</text>
  <text x="350" y="384" text-anchor="middle" font-size="11" fill="#6b7280">HTTP 200 ≠ 功能正確</text>
  <!-- LEFT: 回饋學習 -->
  <rect x="16" y="160" width="155" height="100" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="93" y="192" text-anchor="middle" font-size="14" font-weight="700" fill="#92400e">④ 回饋學習</text>
  <text x="93" y="210" text-anchor="middle" font-size="12" fill="#f59e0b">Wiki · 知識閉環</text>
  <text x="93" y="227" text-anchor="middle" font-size="11" fill="#6b7280">Dev Diary → Ingest</text>
  <text x="93" y="243" text-anchor="middle" font-size="11" fill="#6b7280">失敗模式 → 防重蹈</text>
  <!-- Arrows clockwise -->
  <!-- TOP → RIGHT -->
  <path d="M 460 75 Q 590 80 600 160" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#ah)"/>
  <!-- RIGHT → BOTTOM -->
  <path d="M 610 260 Q 620 340 460 350" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#ah)"/>
  <!-- BOTTOM → LEFT -->
  <path d="M 240 362 Q 120 370 110 260" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#ah)"/>
  <!-- LEFT → TOP -->
  <path d="M 100 160 Q 90 75 240 68" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#ah)"/>
  <!-- inner connections to center -->
  <line x1="350" y1="96" x2="350" y2="150" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="530" y1="210" x2="410" y2="210" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="350" y1="320" x2="350" y2="270" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="171" y1="210" x2="290" y2="210" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,3"/>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">AgenticOps 四階段持續循環——每輪結束後系統比上一輪更聰明</figcaption>
</figure>

---

## 清點三週的進展

### ✅ 已落地：Knowledge Graph MCP

文章中把 Knowledge Graph MCP 列為「Phase 2（50 頁時啟動）」的計畫。

現狀：知識圖譜 MCP 容器已在生產環境跑了幾週。REST API 提供全文搜尋、概念查詢、關聯圖遍歷三個端點，每次接到新需求時的第一步就是查詢確認影響範圍。wiki 頁面突破 121 頁，實體/概念/策略/系統架構/工具等分類齊全。

今天更進一步：知識庫的 export 流水線完成最後一哩路——

```
前端觸發 export
  → API 服務送到訊息佇列
    → 知識庫寫入服務消費
      → 寫入 vault
        → git commit + push 到 GitHub
```

這個流水線有個有趣的故事：dispatch 端（送訊息的一端）三個月前就建好了。但消費端從來沒被部署。Queue 裡積壓了幾十條訊息，每次 export 都等滿 15 秒 timeout 才失敗。**「生產者已上線、消費者未實作」** 的架構缺口，在這個 session 才被補上。

教訓：API 能呼叫、200 OK、沒有錯誤訊息——不代表功能正確。

---

### ✅ 已落地：自主診斷（L3 Auto-Fix Scanner）

文章中的「自主部署-驗證-回滾」被我描述為未來方向：

> AI 部署後自動查詢 Prometheus 指標。如果 CPU/memory 超過閾值，自動回滾。

今天的現實更有趣，也更務實。

三週的演化路徑是這樣的：

```
Phase O（5/2 完成）
 → 全服務對齊可觀測性全家桶（OTel + Loki + Tempo + Prometheus）
 → Alertmanager + Telegram 整合（不再需要人工看監控面板）

L0-L1（4/7 完成）
 → Prometheus alert → autoheal 自動重啟
 → 健康監控服務（每 5 分鐘三層掃描）

L2（4/7 完成）
 → 健康監控服務主動偵測 + Telegram heartbeat

L3 Slice 1（5/3-5/4 完成）
 → 三路偵測：Prometheus firing + Tempo error traces + Loki ERROR logs
 → 雙路 AND fusion（Tempo ∩ Loki，避免 false positive）
 → Dry-run fix proposal 持久化到系統狀態目錄
 → 排程每 15 分鐘自動觸發
```

L3 Slice 1 是 **dry-run** 階段：它偵測、分析、產提案，但不執行任何修改。這是刻意的設計——在 ≥ 5 個提案精準度 ≥ 95% + 48-72 小時觀察期之後，才進入 Slice 2 的 production mode。

這個設計有個重要洞見：**自動化信任需要被賺取，不能被假設**。

---

### ✅ 已落地：多 Agent 協作

文章中描述多 agent 是「當單一 agent 能力達到天花板時的下一步」。

實際上它在三週內就常態化了。今天的工作流包含：
- 並行 subagent 執行獨立的診斷任務
- Explore agent 用於大範圍 codebase 搜尋
- 三方並行審核（主程序 + Sonnet + Gemini）在重大架構決策前強制執行

重要的是：多 agent 協作不是「大任務時才用的特殊模式」，而是日常工作流的一部分。

---

### 📈 比預期走更遠：L3 的設計哲學演化

文章的「自主部署-驗證-回滾」隱含了一個假設：**發現問題 → 自動修復**。

但三週的實踐揭示了一個更微妙的問題：*什麼叫做「問題」？*

L3 scanner 的雙路 AND fusion rule 是這樣設計的：

```
有效 incident = Tempo error trace ∩ Loki ERROR log（同 TraceId）
```

今天 Tempo 出現了若干 HTTP 錯誤 traces，但 Loki 一條對應 ERROR log 都沒有。這些是 HTTP 4xx responses，是 expected behavior，不是 incident。

如果用單路偵測，會產生多個 false positive proposals。雙路 AND 過濾後，0 proposals，靜默釋放。

這個設計決策背後的思考是：**過度告警的 self-healing 系統是有害的，因為它會被人類忽略**。就像每次都報假警的火警系統，大家開始習慣不理它。

真正有用的自愈系統，必須「沉默時讓人信任它，發聲時讓人重視它」。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style="max-width:700px;width:100%;font-family:'Segoe UI',Arial,sans-serif">
  <defs>
    <marker id="a2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#64748b"/></marker>
    <marker id="a2r" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#ef4444"/></marker>
  </defs>
  <rect width="700" height="340" fill="#f8fafc" rx="16"/>
  <text x="350" y="32" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">L3 Auto-Fix Scanner：三路偵測 × 雙路 AND Fusion</text>
  <!-- Sources -->
  <rect x="20" y="60" width="140" height="60" rx="10" fill="#fff7ed" stroke="#f97316" stroke-width="2"/>
  <text x="90" y="85" text-anchor="middle" font-size="13" font-weight="700" fill="#c2410c">Prometheus</text>
  <text x="90" y="103" text-anchor="middle" font-size="11" fill="#ea580c">Metrics / Alerts</text>
  <rect x="20" y="145" width="140" height="60" rx="10" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="90" y="170" text-anchor="middle" font-size="13" font-weight="700" fill="#6d28d9">Tempo</text>
  <text x="90" y="188" text-anchor="middle" font-size="11" fill="#8b5cf6">Error Traces</text>
  <rect x="20" y="230" width="140" height="60" rx="10" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/>
  <text x="90" y="255" text-anchor="middle" font-size="13" font-weight="700" fill="#065f46">Loki</text>
  <text x="90" y="273" text-anchor="middle" font-size="11" fill="#10b981">ERROR Logs</text>
  <!-- Arrows to fusion -->
  <line x1="160" y1="90" x2="250" y2="140" stroke="#64748b" stroke-width="1.5" marker-end="url(#a2)"/>
  <line x1="160" y1="175" x2="250" y2="195" stroke="#64748b" stroke-width="1.5" marker-end="url(#a2)"/>
  <line x1="160" y1="260" x2="250" y2="215" stroke="#64748b" stroke-width="1.5" marker-end="url(#a2)"/>
  <!-- AND Fusion box -->
  <rect x="250" y="145" width="150" height="90" rx="12" fill="#1e293b"/>
  <text x="325" y="180" text-anchor="middle" font-size="13" font-weight="700" fill="#f1f5f9">AND Fusion</text>
  <text x="325" y="198" text-anchor="middle" font-size="12" fill="#94a3b8">Tempo ∩ Loki</text>
  <text x="325" y="214" text-anchor="middle" font-size="11" fill="#64748b">同一 TraceId</text>
  <text x="325" y="228" text-anchor="middle" font-size="10" fill="#475569">Prometheus 獨立標記</text>
  <!-- Arrow to decision -->
  <line x1="400" y1="190" x2="450" y2="190" stroke="#64748b" stroke-width="2" marker-end="url(#a2)"/>
  <!-- Decision diamond -->
  <polygon points="490,165 540,190 490,215 440,190" fill="#fef9c3" stroke="#eab308" stroke-width="2"/>
  <text x="490" y="187" text-anchor="middle" font-size="11" font-weight="700" fill="#713f12">有效</text>
  <text x="490" y="201" text-anchor="middle" font-size="11" font-weight="700" fill="#713f12">事件?</text>
  <!-- No → silence -->
  <line x1="490" y1="215" x2="490" y2="265" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
  <text x="500" y="248" font-size="11" fill="#94a3b8">否</text>
  <rect x="440" y="265" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="490" y="281" text-anchor="middle" font-size="11" fill="#94a3b8">靜默釋放</text>
  <text x="490" y="297" text-anchor="middle" font-size="10" fill="#cbd5e1">避免警報疲勞</text>
  <!-- Yes → proposal -->
  <line x1="540" y1="190" x2="590" y2="190" stroke="#ef4444" stroke-width="2" marker-end="url(#a2r)"/>
  <text x="563" y="183" font-size="11" fill="#ef4444">是</text>
  <!-- Stages -->
  <rect x="590" y="60" width="95" height="50" rx="8" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="637" y="81" text-anchor="middle" font-size="12" font-weight="700" fill="#b91c1c">Dry-run</text>
  <text x="637" y="97" text-anchor="middle" font-size="11" fill="#ef4444">提案產生</text>
  <rect x="590" y="130" width="95" height="50" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="637" y="151" text-anchor="middle" font-size="12" font-weight="700" fill="#92400e">觀察期</text>
  <text x="637" y="167" text-anchor="middle" font-size="11" fill="#f59e0b">精準度 ≥ 95%</text>
  <rect x="590" y="200" width="95" height="50" rx="8" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="637" y="221" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">執行</text>
  <text x="637" y="237" text-anchor="middle" font-size="11" fill="#10b981">Slice 2 未來</text>
  <!-- vertical arrow between stages -->
  <line x1="637" y1="110" x2="637" y2="130" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
  <line x1="637" y1="180" x2="637" y2="200" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
  <!-- connection from decision to stage 1 -->
  <line x1="637" y1="190" x2="637" y2="110" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>
  <!-- Trust label -->
  <text x="350" y="320" text-anchor="middle" font-size="12" fill="#64748b" font-style="italic">「自動化信任需要被賺取，不能被假設」— 沉默時可信，發聲時被重視</text>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">L3 三路偵測架構：雙路 AND Fusion 過濾雜訊，確保每個告警都值得被處理</figcaption>
</figure>

---

## 一個沒有預見到的新模式

文章描述的五層架構，有個隱含的假設：**Harness 是靜態的。** 它是固定的規則、固定的工作流、固定的知識結構。

三週後我發現，最有趣的演化不在任何一層，而是在**層與層之間的動態連結**。

今天的一個例子：

1. 使用者回報「均值回歸策略的交易標的範圍設定看起來沒有生效」（Telegram）
2. 診斷路徑：查日誌 → 發現個股訊號穿透到限定標的帳戶 → grep 程式碼 → 找到自動交易處理器模組缺少帳戶層的標的範圍過濾
3. 修復部署
4. 使用者確認行為預期，反問停損模式
5. 分析停損根因（修復前的舊倉 + 市場分歧，非程式碼問題）
6. 發現部位大小計算器以「當前淨值」而非「初始資金」作為建倉基準
7. 使用者確認設計意圖，修復

整個流程大約 90 分鐘，橫跨了：Telegram 指令 → Loki 日誌診斷 → 程式碼 grep → 設計決策確認 → 修復部署 → 使用者驗證 → 繼續診斷 → 再修復。

這不是 skill 執行，不是 hook 觸發，也不是 wiki 查詢——它是**整個系統動態協作**的結果。

這讓我想到一個新定義：

> **Harness 的成熟標誌，不是單個機制有多強大，而是這些機制在真實問題面前能多流暢地組合在一起。**

---

## 量化：今日的修復清單

以下是今天這個 session 完成的工作，可以對照文章中的原始 baseline：

| 問題類型 | 描述 |
|---------|------|
| 隱性業務規則 | 結算日假日往後順延邏輯錯誤，補假後的結算日不被識別 |
| 可觀測性基礎 | Tracing 系統達到容量上限，全服務 trace 匯出失敗 |
| Dead config field | 帳戶層的交易標的範圍設定存在但未接線到執行路徑 |
| 設計意圖偏差 | 部位大小計算器使用動態淨值而非固定初始資金作為基準 |
| 架構缺口 | 知識庫寫入服務從未部署，訊息佇列積壓數十條 |
| L3 噪音過濾 | Phase 1B 裸 HTTP 方法 trace 過濾規則 |

六個不同類型的 bug，在同一個 session 內全部診斷並修復——這是 harness 成熟的直接體現：每個工具發揮它該發揮的角色，組合在一起才有這樣的效率。

---

## 最大的反思：「衡量」的層次升級

文章中的第三個核心洞見是「衡量改變了一切」，那時的衡量是**手動的 friction 矩陣**——每週回顧 Insights 報告，統計各類問題發生次數。

三週後，衡量本身也自動化了。

L3 scanner 每 15 分鐘做的事，本質上是：*系統在衡量自己的健康狀態*。Prometheus 記錄指標，Loki 收集日誌，Tempo 追蹤 error，L3 的 dual AND fusion 判斷什麼是真實問題、什麼是噪音。

從「人工定期看儀表板」到「系統持續自我觀察」，衡量的角色從**被動記錄**變成了**主動監控**。

這個轉變帶來了一個新問題：如果系統能觀察自己，下一步是什麼？

答案在 L3 Slice 2 的路線圖裡。但更重要的是，這個問題本身揭示了一個方向：**Harness Engineering 正在演化成 AgenticOps——不只是讓 AI 可靠運作的工程體系，而是讓 AI 系統能自我維護的運營體系。**

---

## 一個尚待突破的盲點：E2E 測試覆蓋率

在整理這些進展的同時，我注意到一個缺口：

**SBE 覆蓋了需求理解，但尚未覆蓋 E2E 測試覆蓋率。**

4/12 文章中提到 SBE 可以擴展到 Performance SBE、Observability SBE、Contract SBE。我們在 L3 的 Observability SBE 方向走得很深。但最近觀察到一個趨勢——許多開源 AI Coding Agent 相關專案開始強調的不只是「讓 AI 寫測試」，而是「E2E 測試對程式碼變更的覆蓋率」。

傳統的 unit test coverage 衡量「測試覆蓋了多少程式碼行」。但在 AI-assisted 開發中，這個指標有個盲點：AI 同時寫測試和實作，覆蓋率可以很高，但測試可能只是在驗證 AI 自己的假設，不是在驗證真實的業務行為。

E2E 覆蓋率的方向更有趣：

```
SBE 定義的例子
  → 自動化 E2E 場景（Given/When/Then → Playwright / API test）
    → 每次程式碼變更驗證 E2E 通過
      → 追蹤「哪些 SBE 例子目前有 E2E 覆蓋，哪些沒有」
```

這不是「測試覆蓋率」，而是「**需求覆蓋率**」——有多少 SBE 例子被 E2E 自動化保護。

目前我還沒有看到成熟的框架將 SBE 例子和 E2E 自動化場景自動關聯、追蹤覆蓋率。這可能是 AI-assisted 開發工具鏈的下一個演化點。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg" style="max-width:700px;width:100%;font-family:'Segoe UI',Arial,sans-serif">
  <defs>
    <marker id="a3" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#64748b"/></marker>
    <marker id="a3g" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#10b981"/></marker>
  </defs>
  <rect width="700" height="300" fill="#f8fafc" rx="16"/>
  <text x="350" y="32" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">E2E 活規格文件：需求覆蓋率自我增長循環</text>
  <!-- Stage boxes -->
  <rect x="20" y="90" width="120" height="90" rx="12" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
  <text x="80" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#1d4ed8">SBE</text>
  <text x="80" y="138" text-anchor="middle" font-size="11" fill="#3b82f6">需求例子</text>
  <text x="80" y="155" text-anchor="middle" font-size="10" fill="#6b7280">Given/When/Then</text>
  <text x="80" y="170" text-anchor="middle" font-size="10" fill="#6b7280">業務行為定義</text>
  <line x1="140" y1="135" x2="175" y2="135" stroke="#64748b" stroke-width="2" marker-end="url(#a3)"/>
  <rect x="175" y="90" width="120" height="90" rx="12" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="235" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#6d28d9">E2E 自動化</text>
  <text x="235" y="138" text-anchor="middle" font-size="11" fill="#8b5cf6">Playwright</text>
  <text x="235" y="155" text-anchor="middle" font-size="10" fill="#6b7280">Golden Path</text>
  <text x="235" y="170" text-anchor="middle" font-size="10" fill="#6b7280">每次部署自動跑</text>
  <line x1="295" y1="135" x2="330" y2="135" stroke="#64748b" stroke-width="2" marker-end="url(#a3)"/>
  <rect x="330" y="90" width="120" height="90" rx="12" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="390" y="117" text-anchor="middle" font-size="13" font-weight="700" fill="#92400e">需求覆蓋率</text>
  <text x="390" y="135" text-anchor="middle" font-size="11" fill="#f59e0b">Coverage Tracking</text>
  <text x="390" y="152" text-anchor="middle" font-size="10" fill="#6b7280">哪些例子有 E2E 保護</text>
  <text x="390" y="167" text-anchor="middle" font-size="10" fill="#6b7280">哪些尚未覆蓋</text>
  <line x1="450" y1="135" x2="485" y2="135" stroke="#64748b" stroke-width="2" marker-end="url(#a3)"/>
  <rect x="485" y="90" width="120" height="90" rx="12" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="545" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#065f46">系統演進</text>
  <text x="545" y="138" text-anchor="middle" font-size="11" fill="#10b981">新功能部署</text>
  <text x="545" y="155" text-anchor="middle" font-size="10" fill="#6b7280">迴歸檢測</text>
  <text x="545" y="170" text-anchor="middle" font-size="10" fill="#6b7280">設計變更</text>
  <!-- Feedback arrow back from system evolve to SBE (bottom arc) -->
  <path d="M 545 180 Q 545 240 390 255 Q 235 270 80 235 Q 40 220 40 180" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6,3" marker-end="url(#a3g)"/>
  <text x="312" y="272" text-anchor="middle" font-size="12" fill="#10b981" font-weight="600">SBE 例子隨系統演進自我增長</text>
  <!-- Bottom label -->
  <text x="350" y="292" text-anchor="middle" font-size="11" fill="#94a3b8">目標：E2E 測試不只是「測試」，而是永遠準確反映業務規格的活文件</text>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">E2E 活規格文件演化：需求覆蓋率追蹤讓測試套件隨系統自我增長</figcaption>
</figure>

---

## 下一步

從今天的工作可以看出一些未完成的方向：

**L3 Slice 2**：dry-run 提案的精準度觀察期需要達到 ≥ 5 個有效提案 + 精準度 ≥ 95%。目前只有 1 個提案（近期的 Redis 重載事件）。

**知識庫寫入服務的權限問題**：容器以特權身份建立的檔案需要手動調整擁有者。改為非特權用戶執行可以根本解決。

**L3 Slice 2 的自動執行**：當觀察期結束，下一步是讓 L3 真正執行修復——而不是只寫 dry-run proposal。這是從「自我觀察」到「自我修復」的關鍵一步。

**SBE + E2E 覆蓋率**：將 SBE 例子和 E2E 自動化場景建立系統性關聯，追蹤「需求覆蓋率」而非只是程式碼行覆蓋率。

---

三週前的文章結尾說：「能衡量自己的 harness，才是能改善的 harness。」

今天的補充是：能觀察自己的系統，才是能進化的系統。

*使用 [Claude Code](https://claude.ai/code) 建構與實踐。*
