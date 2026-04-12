---
title: "Harness Engineering 方法論：從 CLAUDE.md 到自進化的 AI 開發體系"
date: 2026-04-12
categories:
  - 技術
tags:
  - AI
  - Claude Code
  - Harness Engineering
  - 方法論
  - 工作流自動化
excerpt: "Agent = Model + Harness。模型再強，沒有 harness 就只是一台沒有方向盤的引擎。本文整理我在生產環境中實踐 Harness Engineering 的完整方法論——五層架構、三個核心洞見、以及仍在演進中的下一步。"
toc: true
toc_sticky: true
---

## 從一個挫折說起

我開始使用 AI Coding Agent 後遇到的第一個嚴重問題，不是模型寫出 bug，而是**模型連續兩次提出我已經否決過的方案**。

第一次我耐心解釋為什麼 polling 不行、要用 event-driven。第二次我意識到：這不是模型的問題，而是**我沒有建立系統來約束它**。

這是我接觸 Harness Engineering 的起點。

---

## 什麼是 Harness Engineering

社群的共識越來越明確：

> **Agent = Model + Harness**

Harness 是模型以外的一切——行為規範、自動化護欄、工作流模板、知識系統、以及讓這一切持續進化的回饋迴圈。

模型是引擎；harness 是底盤、方向盤、煞車和導航。引擎再強大，沒有底盤的車只會在原地空轉。

---

## 五層架構

在實踐中，我的 harness 自然演化出五個層次。每一層解決一個特定的失敗模式，而且**越往上層的 ROI 越高**：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 440" style="width:100%;height:auto;max-width:100%;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="s"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <linearGradient id="z1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#667eea"/><stop offset="100%" stop-color="#764ba2"/></linearGradient>
    <linearGradient id="z2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f093fb"/><stop offset="100%" stop-color="#f5576c"/></linearGradient>
    <linearGradient id="z3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4facfe"/><stop offset="100%" stop-color="#00f2fe"/></linearGradient>
    <linearGradient id="z4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#43e97b"/><stop offset="100%" stop-color="#38f9d7"/></linearGradient>
    <linearGradient id="z5" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fa709a"/><stop offset="100%" stop-color="#fee140"/></linearGradient>
  </defs>
  <rect width="800" height="440" rx="12" fill="#1e1e2e"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#e0e0e0">五層 Harness 架構</text>
  <text x="400" y="52" text-anchor="middle" font-size="12" fill="#999">越往上層，ROI 越高</text>

  <g filter="url(#s)"><rect x="40" y="72" width="720" height="58" rx="10" fill="url(#z5)"/><text x="70" y="100" font-size="13" font-weight="bold" fill="white">第五層</text><text x="140" y="100" font-size="14" font-weight="bold" fill="white">自我改善迴圈</text><text x="680" y="100" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="end">用數據改善 harness 本身</text></g>

  <g filter="url(#s)"><rect x="40" y="140" width="720" height="58" rx="10" fill="url(#z4)"/><text x="70" y="168" font-size="13" font-weight="bold" fill="#1a1a2e">第四層</text><text x="140" y="168" font-size="14" font-weight="bold" fill="#1a1a2e">知識持久化</text><text x="680" y="168" font-size="11" fill="rgba(0,0,0,0.4)" text-anchor="end">打破每個 session 從零開始的問題</text></g>

  <g filter="url(#s)"><rect x="40" y="208" width="720" height="58" rx="10" fill="url(#z3)"/><text x="70" y="236" font-size="13" font-weight="bold" fill="white">第三層</text><text x="140" y="236" font-size="14" font-weight="bold" fill="white">工作流模板</text><text x="680" y="236" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="end">多步驟流程不再跳步</text></g>

  <g filter="url(#s)"><rect x="40" y="276" width="720" height="58" rx="10" fill="url(#z2)"/><text x="70" y="304" font-size="13" font-weight="bold" fill="white">第二層</text><text x="140" y="304" font-size="14" font-weight="bold" fill="white">自動化護欄</text><text x="680" y="304" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="end">不依賴模型記憶力的強制執行</text></g>

  <g filter="url(#s)"><rect x="40" y="344" width="720" height="58" rx="10" fill="url(#z1)"/><text x="70" y="372" font-size="13" font-weight="bold" fill="white">第一層</text><text x="140" y="372" font-size="14" font-weight="bold" fill="white">行為規範</text><text x="680" y="372" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="end">AI agent 的憲法</text></g>

  <text x="400" y="425" text-anchor="middle" font-size="11" fill="#666">每一層解決一個特定失敗模式。單獨任何一層都不夠。</text>
</svg>

---

## 第一層：行為規範——AI 的憲法

CLAUDE.md 是整個 harness 的基石。它定義了 AI 在這個專案中**什麼能做、什麼不能做、怎麼做**。

但我學到的第一課是：CLAUDE.md 不是寫一次就好的靜態文件。它是**活的法典**，每一條規則背後都有一個故事。

### 規則的三種來源

**架構原則**——來自技術判斷：

```markdown
事件驅動優先，禁止 Polling：
所有狀態變更必須透過事件/回調/TTL 過期驅動。
```

**Bug 防護規則**——來自生產事故：

```markdown
共享狀態寫入必須過濾來源：
更新 store 前，必須檢查 symbol === currentSymbol。
```

這條規則來自一次因為 tick handler 沒有過濾 symbol 導致不同標的的報價互相覆蓋的事故。

**完整性規範**——來自被反覆咬到的疏忽：

```markdown
修 bug 時，必須先 grep 整個 codebase 找出所有相同 pattern 的位置。
禁止只修第一個找到的 occurrence 就宣告完成。
```

### 多層級管理

一份 CLAUDE.md 管不了所有事。我的實踐是分層：

| 層級 | 範圍 | 內容 |
|------|------|------|
| 全域 | 所有專案通用 | 語言、部署環境、資料保護、Bash 行為準則 |
| 專案 | 單一 repo | 架構原則、Bug 防護規則、服務職責劃分 |
| 知識庫 | Wiki vault | 三層架構規範、ingest 流程、frontmatter schema |

專案層級可以覆蓋全域設定，知識庫有自己獨立的 schema。每一層都是**該層級的最高權威**。

### 第一層的局限

這是我最深刻的體悟：

> **規則存在 ≠ 規則被遵守。**

CLAUDE.md 已經覆蓋了約 90% 的已知問題場景。但 AI 仍然會犯那些被明文禁止的錯誤。不是因為它「不聽話」，而是因為文字規則是**被動的**——模型必須主動記得去查閱。在複雜的多步驟任務中，這種記憶力是不可靠的。

這就是為什麼只有第一層遠遠不夠。

---

## 第二層：自動化護欄——不依賴記憶力的強制執行

Hook 是在 AI 工具呼叫的生命週期中自動觸發的 shell 指令。它的價值在於：**不管模型記不記得規則，hook 都會執行**。

### 我的四個 hook

| Hook | 觸發時機 | 防護的問題 |
|------|---------|-----------|
| 語法驗證器 | 每次編輯檔案後 | `.py` 語法錯誤、`.json` 格式錯誤 |
| Commit 守衛 | git commit 前 | 硬編碼密鑰、遺留的 debug 語句 |
| Wiki 自動提交 | 編輯知識庫後 | 知識變更漏提交 |
| 成本追蹤器 | Session 結束 | 資源消耗不透明 |

### 設計原則：在犯罪現場攔截

Hook 的核心設計哲學是**在最接近錯誤發生的時間點攔截**：

- 語法錯誤 → 在**編輯後**立刻驗證，不是等到部署時
- 密鑰洩漏 → 在 **commit 前**掃描，不是等到 code review
- 知識變更 → **寫入後**自動提交，不需要記得手動 git push

### PostToolUse vs PreToolUse 的取捨

這是一個設計上的微妙選擇：

- **PreToolUse**：能阻止操作，但看不到結果
- **PostToolUse**：能看到結果，但操作已經執行

對語法驗證，PostToolUse 是正確選擇——檔案短暫存在於磁碟上是無害的，但模型能立刻看到精確的錯誤訊息並被強制修正。

### 第二層的價值

如果說第一層是「告訴模型不要犯錯」，第二層就是「不管模型記不記得，都自動檢查」。從我的實踐數據來看，**自動化護欄的效果大約是文字規則的 10 倍**。

---

## 第三層：工作流模板——把機構知識編碼成可執行的流程

Skill 是可重用的 prompt 工作流，透過斜線指令觸發。它解決的問題是：**複雜的多步驟流程，在時間壓力下總有步驟被跳過**。

### 部署流程的演化

以部署為例。我的部署流程有 7 個步驟，從範圍掃描到健康檢查到知識記錄。在沒有 skill 之前，後面幾步（健康檢查、Telegram 通知、Dev Diary）經常被跳過——不是故意的，而是「做完主要工作就覺得完成了」。

把它編碼成 `/deploy` skill 後，這個問題徹底消失。Skill 不允許你在步驟 4 就停下來。

### Specification by Example：需求理解的入口

這是我最近加入的 skill，也是對傳統開發流程最大的反思。

傳統 TDD 在 AI 時代有一個根本性缺陷：**AI 同時寫測試和實作，等於自己批改自己的作業。** 測試成了 self-fulfilling prophecy，不是真正的規格。

我的解法是 `/spec-by-example`——在寫任何程式碼之前，先讓 AI 用具體的 Given/When/Then 例子表達它的理解，然後**人類確認這些例子**。只有通過確認 gate 後才進入開發。

```
需求 → AI 產出具體例子 → 人類確認 → AI 實作
         (暴露理解偏差)   (硬性 gate)   (根據確認的 spec)
```

核心哲學：**在 Agentic 時代，specification 才是人類最有價值的貢獻。** AI 負責產出和實作，人類負責確認「AI 是否真的理解了我要什麼」。

### Skill 之間的組合

Skills 不是孤立的，它們形成工作流圖：

```
需求 → /sbe（確認 spec）
         → 實作
           → /deploy（部署驗證）
               → /devdiary（知識沉澱）
```

每個 skill 負責流程的一段，串聯起來就是完整的開發閉環。

---

## 第四層：知識持久化——打破土撥鼠日

AI Agent 最大的結構性弱點是**每個 session 從零開始**。上一次花了 30 分鐘釐清的設計決策，下一次又得重新解釋。

我用三層知識架構解決這個問題：

### Session 記憶

跨 session 的持久化記憶，按類型分檔：

- **使用者輪廓**：角色、偏好、專業程度
- **行為回饋**：使用者的糾正（正面和負面都記）
- **專案狀態**：進行中的計畫和決策

目前累積了 40+ 個記憶檔案。關鍵是**同時記錄成功和失敗**——如果只記糾正，模型會變得過度保守。

### 知識 Wiki

採用 Karpathy LLM Wiki 三層架構：

```
CLAUDE.md — Schema 定義層（人+AI 共編）
    ↓
raw/    — 不可變原始資料（AI 只讀）
    ↓ ingest
wiki/   — AI 編譯的知識層（AI 完全擁有）
```

核心鐵律：**AI 絕不修改 raw/**。所有原始資料（系統匯出、文章、對話記錄）先進 raw/，然後透過 ingest 流程由 AI 消化重寫成 wiki/ 中的結構化知識。

這個設計防止了「摘要的摘要」級聯損失——raw 永遠保存完整原文，ingest 可以反覆執行。

Wiki 透過 MCP (Model Context Protocol) 暴露給 AI，提供 `search`、`get_concept`、`related` 三個查詢工具。每次接到新需求，AI 的第一步就是查 wiki 確認影響範圍和既有設計決策。

### Dev Diary

每個完成的任務都有結構化日誌：問題描述 → 分析過程 → 設計決策 → 實作要點 → 踩到的坑 → 核心心得。

Dev Diary 的價值不只是記錄，而是**讓失敗的嘗試也成為知識資產**。很多時候，踩過的坑比成功的路徑更有價值。

---

## 第五層：自我改善迴圈——用數據改善 harness 本身

前四層構成了一個能運作的 harness。但如果只是「建好就不動」，它遲早會腐化——新的問題浮現，舊的規則變得過時。

第五層的職責是**讓 harness 自己變得更好**。

### PDCA 循環

```
Plan  → 分析 Insights 報告，識別 friction 模式
Do    → 實施改善（新規則、新 hook、新 skill）
Check → 下次 Insights 與基線對照，驗證效果
Act   → 保留有效的，移除無效的
```

### 量化追蹤

光靠感覺是不夠的。我在 wiki 中建立了 friction 追蹤矩陣：

| 摩擦類型 | 基線 | 目標 |
|---------|------|------|
| 錯誤方法（提出被禁止的方案）| 31 次 | ≤ 10 |
| Bug 程式碼（語法/參數錯誤）| 20 次 | ≤ 8 |
| 任務完全達成率 | 62% | ≥ 75% |

每次審視 Insights 時，更新矩陣、追加 review 歷程、對照目標。

### Skill 自進化

更有趣的是 `/skill-evolve`——它從 wiki 和 memory 中偵測 pattern，自動建議 skill 的更新。例如：

- 同一類踩坑出現 2+ 次 → 在對應 skill 加入警告
- 新的工作流 pattern 出現 3+ 次且無對應 skill → 建議建立新 skill
- CLAUDE.md 某條指示反覆被忽略 → 建議強化措辭或改用 hook

這讓 harness 從「人工維護」走向「半自動進化」。

---

## 三個核心洞見

回顧整個實踐過程，有三件事是我一開始沒有預期到的：

### 洞見一：自動化護欄 >> 文字規則

這是最反直覺的。我花了大量時間撰寫詳盡的 CLAUDE.md 規則，覆蓋了 90% 的已知問題場景。但模型依然犯那些錯誤。

轉折點是我開始加入 hook 之後——一個簡單的語法驗證 hook，在每次編輯後自動執行 `py_compile` 和 `json.loads`。效果立竿見影。

**教訓：不要期待模型「記住」規則。要把規則變成自動執行的程式。**

### 洞見二：事件驅動思維適用於 harness 本身

我在系統架構中堅持「事件驅動，禁止 polling」。後來發現同樣的原則也適用於 harness 的設計：

- **Hook** = 事件驅動（工具觸發）→ 最有效
- **Skill** = 指令驅動（明確呼叫）→ 有效
- **Rule** = 被動等待（靠模型記憶）→ 最弱

最有效的 harness 元件是**反應式**的，不是**宣告式**的。

### 洞見三：衡量改變了一切

在加入第五層之前，我以為最大的問題是「bug 程式碼」。Insights 數據告訴我實際上是「錯誤方法」——模型提出我已經否決過的方案。

**如果我沒有衡量，我會持續投資在錯誤的方向。**

這就是第五層存在的意義：不只是讓 harness 變好，而是讓你**知道該改善什麼**。

---

## 仍在演進的下一步

Harness Engineering 不是一個「完成」的狀態，而是持續演化的過程。以下是我正在探索和規劃的方向：

### Knowledge Graph MCP

目前的 wiki 是平面的 markdown 檔案。下一步是疊加圖層：

- **Phase 2**：NetworkX 圖引擎 + MCP 暴露。wiki 頁面 = 節點，`[[related]]` = 邊。支援社群偵測（Louvain）、路徑查詢、核心概念辨識。
- **Phase 3**：pgvector 語意搜尋。Hybrid retrieval：keyword + 圖遍歷 + 向量搜尋三路合併。

目標是讓 AI 在接到需求時，不只是全文搜尋關鍵字，而是能**沿著概念關聯圖走**，找到間接但重要的影響。

### 自主部署-驗證-回滾

目前的 `/deploy` skill 仍然需要在 session 中手動觸發。未來的方向是：

- AI 部署後自動查詢 Prometheus 指標
- 如果 CPU/memory 超過閾值，自動回滾到上一版
- 全程透過 Telegram 通知，不需要人工介入

### Spec-Driven Development 深化

`/spec-by-example` 目前只覆蓋功能需求。可以擴展到：

- **Performance SBE**：Given 1000 concurrent requests, When hitting /api/xxx, Then response time < 200ms
- **Observability SBE**：Given a service restart, When checking logs after 30s, Then zero ERROR entries
- **Contract SBE**：Given service A publishes to channel X, When service B subscribes, Then data schema matches

讓 SBE 成為所有品質面向的統一語言。

### 多 Agent 協作

當單一 agent 的能力達到天花板時，下一步是**多 agent 分工**：

- 規格 Agent：專門負責 SBE 例子生成和知識查詢
- 實作 Agent：根據確認的 spec 寫程式碼
- 驗證 Agent：專門負責測試和部署驗證

每個 agent 有自己的 harness 子集，透過 spec 文件作為溝通介面。

---

## 如何開始你自己的 Harness

如果你也想建構 harness，我建議的順序是：

1. **CLAUDE.md**——寫下 5 條你最痛的規則。不要試圖面面俱到，從痛點開始。
2. **一個 Hook**——你主要語言的語法驗證器。投入 30 分鐘，立刻見效。
3. **一個 Skill**——你最常重複的多步驟流程。把「你每次都做但有時候會忘」的流程寫成 skill。
4. **開始記錄**——不需要完整的 wiki，從 dev diary 開始。每次任務記「踩了什麼坑、為什麼這樣做」。
5. **衡量**——累積一段時間後回顧。哪些問題反覆出現？哪些規則沒被遵守？數據會告訴你下一步該做什麼。

Harness 不需要在第一天就完美。它是一個活的系統，關鍵是**建立回饋迴圈，讓它自己變好**。

---

## 結語

Harness Engineering 的本質不是「配置 AI 工具」，而是**建構一套讓 AI 能持續可靠運作的工程體系**。

模型會升級、會換代，但好的 harness 是可以遷移的。行為規範、自動化護欄、工作流模板、知識架構、改善迴圈——這些是跨越模型世代的方法論。

我的 harness 仍在演化中。最重要的教訓是：

> **能衡量自己的 harness，才是能改善的 harness。**

---

*使用 [Claude Code](https://claude.ai/code) 建構與實踐。*

**延伸閱讀：**
- [Anthropic - Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic - Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Martin Fowler - Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html)
