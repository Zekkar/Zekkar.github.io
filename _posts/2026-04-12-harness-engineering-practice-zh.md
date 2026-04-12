---
title: "Harness Engineering 實戰：打造自我改善的 AI 開發系統"
date: 2026-04-12
categories:
  - 技術
tags:
  - AI
  - Claude Code
  - Harness Engineering
  - DevOps
  - 工作流自動化
excerpt: "我如何為 Claude Code 建構 5 層 Harness 架構來運營生產級金融系統 — 附 700+ sessions 的真實摩擦數據，證明哪些方法有效。Agent = Model + Harness。"
toc: true
toc_sticky: true
---

## 前言

AI 開發社群近期凝聚出一個關鍵洞見：**Agent = Model + Harness**。Harness 是模型以外的一切 — 編排層、工具、權限控制、記憶系統、上下文管理與工作流自動化。

即使是最頂尖的模型在多輪對話中運作，缺少精心設計的 harness 也會表現不佳。模型傾向一次做太多事，或是過早宣告完成；harness 的職責就是對這些傾向施加結構性約束。

本文記錄了我在 **21 天內經歷 700+ 場 Claude Code sessions**，運營一套包含 36+ Docker 容器的金融交易系統的實戰歷程。我將分享架構設計、摩擦數據，以及讓 harness 持續自我改善的閉環機制。

> 下一個前沿不是更好的模型 — 而是更好的 harness。

---

## 五層 Harness 架構

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" style="width:100%;height:auto;max-width:100%;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="s2"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <linearGradient id="z1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#667eea"/><stop offset="100%" stop-color="#764ba2"/></linearGradient>
    <linearGradient id="z2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f093fb"/><stop offset="100%" stop-color="#f5576c"/></linearGradient>
    <linearGradient id="z3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4facfe"/><stop offset="100%" stop-color="#00f2fe"/></linearGradient>
    <linearGradient id="z4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#43e97b"/><stop offset="100%" stop-color="#38f9d7"/></linearGradient>
    <linearGradient id="z5" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fa709a"/><stop offset="100%" stop-color="#fee140"/></linearGradient>
  </defs>
  <rect width="800" height="420" rx="12" fill="#1e1e2e"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#e0e0e0">五層 Harness 架構</text>
  <text x="400" y="50" text-anchor="middle" font-size="12" fill="#999">Agent = Model + Harness</text>

  <g filter="url(#s2)"><rect x="40" y="70" width="720" height="56" rx="10" fill="url(#z5)"/><text x="70" y="96" font-size="13" font-weight="bold" fill="white">第五層</text><text x="140" y="96" font-size="14" font-weight="bold" fill="white">自我改善迴圈</text><text x="460" y="96" font-size="12" fill="rgba(255,255,255,0.8)">Insights -> Wiki 基線 -> PDCA -> Harness 更新</text></g>

  <g filter="url(#s2)"><rect x="40" y="136" width="720" height="56" rx="10" fill="url(#z4)"/><text x="70" y="162" font-size="13" font-weight="bold" fill="#1a1a2e">第四層</text><text x="140" y="162" font-size="14" font-weight="bold" fill="#1a1a2e">知識持久化</text><text x="460" y="162" font-size="12" fill="rgba(0,0,0,0.5)">跨 Session 記憶 | Wiki (MCP) | Dev Diary</text></g>

  <g filter="url(#s2)"><rect x="40" y="202" width="720" height="56" rx="10" fill="url(#z3)"/><text x="70" y="228" font-size="13" font-weight="bold" fill="white">第三層</text><text x="140" y="228" font-size="14" font-weight="bold" fill="white">工作流模板 (Skills)</text><text x="460" y="228" font-size="12" fill="rgba(255,255,255,0.8)">/sbe | /deploy | /devdiary | /health-check</text></g>

  <g filter="url(#s2)"><rect x="40" y="268" width="720" height="56" rx="10" fill="url(#z2)"/><text x="70" y="294" font-size="13" font-weight="bold" fill="white">第二層</text><text x="140" y="294" font-size="14" font-weight="bold" fill="white">自動化護欄 (Hooks)</text><text x="460" y="294" font-size="12" fill="rgba(255,255,255,0.8)">語法驗證器 | Commit 守衛 | 成本追蹤器</text></g>

  <g filter="url(#s2)"><rect x="40" y="334" width="720" height="56" rx="10" fill="url(#z1)"/><text x="70" y="360" font-size="13" font-weight="bold" fill="white">第一層</text><text x="140" y="360" font-size="14" font-weight="bold" fill="white">行為規範 (CLAUDE.md)</text><text x="460" y="360" font-size="12" fill="rgba(255,255,255,0.8)">架構原則 | Bug 防護規則 | 權限控制</text></g>
</svg>

每一層解決不同的失敗模式。以下從底層開始逐層說明。

---

## 第一層：行為規範 (CLAUDE.md)

**解決的問題**：模型提出違反架構決策的方案，或重複過去的錯誤。

CLAUDE.md 是 AI agent 的「憲法」。我的 CLAUDE.md 從簡單的風格指南演化成 **200+ 行的操作手冊**：

### 架構原則（不可協商）

```markdown
## 架構設計原則
- 事件驅動優先，禁止 Polling：所有狀態變更必須透過事件/回調/TTL 過期驅動
- 偏好 Pub/Sub、Callback、Cache TTL expiry 等機制
- 設計新功能時，若發現需要 polling，必須先提出事件驅動替代方案
```

這條規則的由來：模型**連續兩次**提出 polling 方案，在我強力糾正後，實現了 **98.8% 的 CPU 降幅**。不寫入 CLAUDE.md，每個新 session 都可能重蹈覆轍。

### Bug 防護規則（從生產事故提煉）

一次部署同時引入 3 個 production bug 後，我濃縮出 **8 條防禦規則**：

```markdown
### 1. 共享狀態寫入必須過濾來源
- 更新 store 前，必須檢查 symbol === currentSymbol

### 2. 多腿交易參數必須明確傳遞
- lots, contract_multiplier 禁止依賴預設值

### 3. 定時任務必須三重守衛
必須在執行前驗證：
1. 交易時段：is_trading_time()
2. 數據新鮮度：is_tick_stale(symbol, 120)
3. 報價完整性：兩腿同時有成交價 + BidAsk
```

### 為什麼光靠 CLAUDE.md 不夠

令人不安的事實：**CLAUDE.md 已覆蓋 ~90% 的摩擦場景，但「錯誤方法」仍然發生了 31 次。**

規則存在 ≠ 規則被遵守。這就是需要其餘 4 層的原因。

---

## 第二層：自動化護欄 (Hooks)

**解決的問題**：語法錯誤和安全問題即使有規則也會漏過。

Hooks 是在生命週期事件中執行的 shell 指令。它們提供**不依賴模型記憶力**的自動化強制執行。

### Hook 架構

| Hook | 觸發時機 | 功能 |
|------|---------|------|
| `syntax-validator` | PostToolUse (Edit/Write) | 每次編輯後驗證 `.py` 和 `.json` 語法 |
| `commit-guard` | PreToolUse (git commit) | 掃描暫存區中的密鑰和 debug 語句 |
| `wiki-auto-commit` | PostToolUse (Edit/Write) | 知識庫變更自動 git commit+push |
| `cost-tracker` | Stop | 記錄 session 成本指標 |

### 語法驗證器

```python
# PostToolUse hook：每次檔案編輯後自動驗證語法
def validate_python(filepath):
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", filepath],
        capture_output=True, text=True
    )
    return result.returncode == 0, result.stderr.strip()

def validate_json(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()
        if not content:
            return True, "skip (empty)"
        json.loads(content)
        return True, "JSON OK"
    except json.JSONDecodeError as e:
        return False, f"line {e.lineno} col {e.colno}: {e.msg}"

# 根據副檔名路由到對應驗證器
validators = { ".py": validate_python, ".json": validate_json }
```

### Hook 時序的微妙之處

PostToolUse 在工具**執行完成後**才觸發 — `block` 告訴模型操作失敗，但檔案已寫入磁碟。這是正確的取捨：

- **PostToolUse**：能檢查結果，但無法阻止寫入
- **PreToolUse**：能阻止執行，但看不到結果

語法驗證用 PostToolUse 最理想 — 模型立刻獲得精確錯誤訊息，被迫修正後才能繼續。

---

## 第三層：工作流模板 (Skills)

**解決的問題**：多步驟流程在時間壓力下被跳步。

Skills 是透過 `/commands` 觸發的可重用 prompt 工作流，編碼了「如何」執行複雜操作的機構知識。

### Deploy Skill

部署流程有 **8 個必要步驟**。編碼為 skill 之前，我經常跳過健康檢查和通知：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" style="width:100%;height:auto;max-width:100%;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="sd2"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <marker id="ar2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#bbb"/></marker>
  </defs>
  <rect width="800" height="200" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#e0e0e0">/deploy — 驗證優先部署流程</text>

  <g filter="url(#sd2)">
    <rect x="15" y="50" width="85" height="50" rx="8" fill="#667eea"/><text x="57" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 1</text><text x="57" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">範圍掃描</text>
  </g>
  <line x1="100" y1="75" x2="112" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="117" y="50" width="85" height="50" rx="8" fill="#667eea"/><text x="159" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 2</text><text x="159" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">語法驗證</text>
  </g>
  <line x1="202" y1="75" x2="214" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="219" y="50" width="85" height="50" rx="8" fill="#4facfe"/><text x="261" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 3</text><text x="261" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Git Push</text>
  </g>
  <line x1="304" y1="75" x2="316" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="321" y="50" width="85" height="50" rx="8" fill="#4facfe"/><text x="363" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 4</text><text x="363" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">SSH 部署</text>
  </g>
  <line x1="406" y1="75" x2="418" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="423" y="45" width="95" height="60" rx="8" fill="#43e97b" stroke="#2d8a56" stroke-width="2"/><text x="470" y="70" text-anchor="middle" font-size="10" font-weight="bold" fill="#1a1a2e">Step 5</text><text x="470" y="86" text-anchor="middle" font-size="10" font-weight="bold" fill="#1a1a2e">健康檢查</text><text x="470" y="98" text-anchor="middle" font-size="8" fill="#2d8a56">關鍵步驟</text>
  </g>
  <line x1="518" y1="75" x2="530" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="535" y="50" width="85" height="50" rx="8" fill="#f5576c"/><text x="577" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 6</text><text x="577" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">推送通知</text>
  </g>
  <line x1="620" y1="75" x2="632" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="637" y="50" width="85" height="50" rx="8" fill="#fa709a"/><text x="679" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 7</text><text x="679" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Dev Diary</text>
  </g>
  <line x1="722" y1="75" x2="734" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#ar2)"/>
  <g filter="url(#sd2)">
    <rect x="739" y="55" width="45" height="40" rx="8" fill="#43e97b"/><text x="761" y="80" text-anchor="middle" font-size="18" fill="white">&#10004;</text>
  </g>

  <rect x="15" y="125" width="769" height="60" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
  <text x="30" y="148" font-size="11" font-weight="bold" fill="#f5576c">關鍵洞見：</text>
  <text x="130" y="148" font-size="11" fill="#ccc">Skill 編碼前，Step 5-7 經常被跳過。</text>
  <text x="30" y="170" font-size="11" fill="#ccc">編碼為 /deploy 後，完整流程每次都被強制執行 — skill 不允許你提前停止。</text>
</svg>

### SBE Skill：Specification by Example 作為開發入口

傳統 TDD 在 Agentic 時代有一個根本性缺陷：**AI 同時寫測試和實作，等於自己批改自己的作業。** 測試變成 self-fulfilling prophecy，而非真正的規格。

我設計了 `/spec-by-example` (SBE) skill 作為所有新功能開發的**強制入口**：

```
舊流程：需求 → 影響分析 → BDD 生成 → 實作
新流程：需求 → /sbe（知識探查 + 具體例子 + 人類確認 Gate）→ 實作
```

Skill 包含 6 個步驟：

1. **需求解析** — AI 用自己的話重述需求，提早暴露理解偏差
2. **知識探查** — 查詢 wiki MCP + grep codebase，繪製系統邊界地圖
3. **Example Mapping** — 產出 3 類具體 Given/When/Then 例子：
   - Happy path（正常行為）
   - Edge cases（邊界情況）
   - Error paths（錯誤處理）
4. **人類確認 Gate** — 呈現所有例子給使用者。**不可跳過。** 使用者驗證、修正或新增例子後才能寫 code
5. **Spec 持久化** — 將確認的 spec 寫入 `specs/sbe/` 作為唯一 acceptance criteria
6. **轉入開發** — 將確認的例子轉化為測試骨架，再開始實作

核心洞見：**在 Agentic 時代，specification 才是人類的貢獻。** AI 產出具體例子讓理解變得可驗證；人類確認或修正。AI 只能針對「自己不擁有的規格」寫 code。

這徹底消除了「誤解需求」類型的摩擦 — 誤解在 Step 3-4 就會浮現，而非部署之後。

---

## 第四層：知識持久化

**解決的問題**：每個新 session 從零開始，重複過去的錯誤。

我建構了 **3 層知識系統**：

### 第 1 層：Session 記憶 (MEMORY.md)

按類型組織的跨 session 記憶：

```
memory/
├── MEMORY.md                              # 索引（總是載入）
├── user_profile.md                        # 使用者輪廓
├── feedback_no_polling.md                 # 「禁止提出 polling」
├── feedback_verify_all_code_paths.md      # 「grep 所有位置」
├── project_regime_redesign.md             # 專案進度
└── ... (40+ 記憶檔案)
```

### 第 2 層：知識 Wiki (MCP 整合)

遵循 [Karpathy LLM Wiki](https://gist.github.com/karpathy) 架構：

```
Schema 層 (CLAUDE.md) — 定義結構和規則
         |
raw/ — 不可變原始資料（LLM 只讀）
         |
wiki/ — LLM 編譯的知識層（LLM 完全擁有）
```

透過 **MCP** 暴露 3 個工具：`search()`, `get_concept()`, `related()`。

### 第 3 層：Dev Diary（機構學習）

每個任務產出結構化日誌：問題 → 分析 → 決策 → 實作 → 踩坑 → 心得。打破 AI 助手的「土撥鼠日」問題。

---

## 第五層：自我改善迴圈

**解決的問題**：Harness 本身有盲點，只有數百個 session 後才會浮現。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 220" style="width:100%;height:auto;max-width:100%;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="sp2"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <marker id="ap2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#bbb"/></marker>
  </defs>
  <rect width="800" height="220" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#e0e0e0">PDCA 自我改善循環</text>

  <g filter="url(#sp2)">
    <rect x="50" y="60" width="150" height="70" rx="12" fill="#667eea"/><text x="125" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Plan</text><text x="125" y="108" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">分析 /insights 報告</text><text x="125" y="122" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">識別摩擦模式</text>
  </g>
  <line x1="200" y1="95" x2="230" y2="95" stroke="#bbb" stroke-width="2" marker-end="url(#ap2)"/>
  <g filter="url(#sp2)">
    <rect x="235" y="60" width="150" height="70" rx="12" fill="#4facfe"/><text x="310" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Do</text><text x="310" y="108" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">新增 hooks, skills,</text><text x="310" y="122" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">規則, 記憶</text>
  </g>
  <line x1="385" y1="95" x2="415" y2="95" stroke="#bbb" stroke-width="2" marker-end="url(#ap2)"/>
  <g filter="url(#sp2)">
    <rect x="420" y="60" width="150" height="70" rx="12" fill="#43e97b"/><text x="495" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a1a2e">Check</text><text x="495" y="108" text-anchor="middle" font-size="10" fill="rgba(0,0,0,0.5)">下次 /insights 與</text><text x="495" y="122" text-anchor="middle" font-size="10" fill="rgba(0,0,0,0.5)">Wiki 基線對照</text>
  </g>
  <line x1="570" y1="95" x2="600" y2="95" stroke="#bbb" stroke-width="2" marker-end="url(#ap2)"/>
  <g filter="url(#sp2)">
    <rect x="605" y="60" width="150" height="70" rx="12" fill="#fa709a"/><text x="680" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Act</text><text x="680" y="108" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">推廣有效變更</text><text x="680" y="122" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">移除無效變更</text>
  </g>

  <path d="M680,130 C680,180 125,180 125,130" stroke="#fee140" stroke-width="2" fill="none" stroke-dasharray="6,4"/>
  <text x="400" y="178" text-anchor="middle" font-size="11" fill="#fee140">持續改善循環</text>

  <rect x="50" y="195" width="700" height="20" rx="4" fill="rgba(255,255,255,0.05)"/>
  <text x="400" y="210" text-anchor="middle" font-size="10" fill="#999">能衡量自己的 harness，才是能改善的 harness。</text>
</svg>

### 基線追蹤

分析 702 個 sessions 後，建立追蹤摩擦指標的 wiki 頁面：

| 摩擦類型 | 基線 | 目標 |
|---------|------|------|
| 錯誤方法 | 31 次 | &le; 10 |
| Bug 程式碼 | 20 次 | &le; 8 |
| 完全達成率 | 62% | &ge; 75% |
| 指令失敗 | 196 次 | &le; 100 |

### 數據揭示了什麼

最令人意外的發現：**瓶頸不是規則缺失 — 而是執行不一致。**

這改變了投資方向：從「寫更多規則」（第一層）轉向「建構自動化護欄」（第二層）。語法驗證 hook 在編輯時攔截錯誤。Deploy skill 強制執行過去被跳過的步驟。

---

## 實戰數據

21 天、702 個分析的 sessions：

| 指標 | 值 |
|------|-----|
| 總 sessions | 1,195 (702 分析) |
| 訊息數 | 10,276 (467/天) |
| 完全達成率 | 62% |
| 觸及檔案 | 541 |
| 程式碼變更 | +31,011 / -2,349 行 |
| Commits | 159 |
| 最常用工具 | Bash (2,810 次) |
| 遠端操作 | 620 次通訊工具呼叫 |

### 最有效的模型能力

| 能力 | 出現次數 |
|------|---------|
| 多檔案變更 | 41 sessions |
| 優秀的除錯 | 39 sessions |
| 清晰的解釋 | 36 sessions |
| 主動幫助 | 17 sessions |

### 主要摩擦來源

| 類型 | 次數 | 根因 |
|------|------|------|
| 錯誤方法 | 31 | 模型傾向使用簡單 pattern |
| Bug 程式碼 | 20 | 語法錯誤、錯誤參數 |
| 誤解需求 | 4 | 簡短指令的歧義 |

---

## 經驗教訓

### 1. 規則存在 ≠ 規則被遵守

CLAUDE.md 覆蓋 90% 摩擦場景，模型仍犯同樣錯誤 31 次。**自動化強制執行 (hooks) 的價值是文字規則的 10 倍。**

### 2. Harness 應匹配互動風格

我透過手機通訊 app 發簡短指令，期望端到端自主執行。我的 harness 為此優化：skills 編碼完整工作流、memory 跨 session 保存、hooks 即時攔截。

結對程式設計需要不同 harness — 更注重解釋，更少自主。

### 3. 衡量 Harness，不只是產出

加入第五層前，我不知道「錯誤方法」是 #1 摩擦。我以為是 bug 程式碼。**衡量改變了投資優先級。**

### 4. 事件驅動思維也適用於 Harness

- **Hooks** 是事件驅動（工具觸發）— 有效
- **規則** 是被動的（靠記憶力）— 較弱
- **Skills** 是指令驅動（明確呼叫）— 有效

最有效的 harness 元件是反應式的，不是宣告式的。

### 5. 知識系統需要關注點分離

- **Memory**：跨 session 上下文（誰、什麼、偏好）
- **Wiki**：結構化演進知識（概念、架構）
- **Dev Diary**：不可變學習記錄（發生什麼、為什麼）

---

## 如何開始

按順序從這些層級開始：

1. **CLAUDE.md** — 寫下 5 條不可協商規則。隨摩擦逐步添加。
2. **一個 hook** — 主要語言的語法驗證器。立即見效。
3. **一個 skill** — 最常重複的多步驟工作流。
4. **Memory** — 記錄糾正。10 條回饋記憶就能顯著改善一致性。
5. **衡量** — 50+ sessions 後執行 `/insights`。讓數據引導投資。

Harness 不需要第一天就完美。關鍵是**儘早開始衡量**。

---

## 結語

Harness Engineering 是建構 AI agent 作業系統的學科。模型是引擎；harness 是底盤、方向盤、煞車和導航。

700+ sessions 後，我的 harness 從簡單的 CLAUDE.md 演化成 5 層系統。最重要的教訓：

**能衡量自己的 harness，才是能改善的 harness。**

---

*使用 [Claude Code](https://claude.ai/code) 建構。用 `/insights` 衡量。透過 PDCA 改善。*

**參考資料：**
- [Anthropic - Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic - Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Martin Fowler - Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html)
- [TechTalks - The Art of AI Harness Engineering](https://bdtechtalks.substack.com/p/the-art-of-ai-harness-engineering)
