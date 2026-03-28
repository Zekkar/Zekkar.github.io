---
title: "用 AI 打造自主學習的交易分析系統：從 Telegram 指令到動態 Agent 架構"
date: 2026-03-28
categories:
  - 技術
tags:
  - AI
  - Claude Code
  - Agent
  - 交易系統
  - 系統架構
excerpt: "記錄一天內如何透過 Claude Code + Telegram 完成交易系統的 bug 修復、架構升級、和動態 Agent 實作的完整開發流程。"
toc: true
toc_sticky: true
---

## 前言

這篇文章記錄了我在 2026 年 3 月 28 日，透過 Claude Code CLI 搭配 Telegram 完成的一整天開發工作。

核心主題是：**如何讓交易分析系統從「固定管線」演化為「動態 Agent 架構」**，像查理芒格那樣根據事件性質自主選擇分析工具和推理路徑。

一天之內完成了三個系統的修復和升級，產出 30+ commits、修改/新增 50+ 檔案、涵蓋兩個獨立的交易系統（Shioaji 台灣期貨 + IBAPI 美國期貨）。

---

## 整體工作流程

![AI 輔助開發工作流](/assets/images/2026-03-28/ai-dev-workflow.svg)

整個流程的特點是：**我在 Telegram 上下達指令和確認設計，Claude Code 負責程式碼的搜尋、分析、撰寫、部署和驗證。** 每個階段都有明確的交接點：

1. **Telegram 指令** — 用自然語言描述需求（「幫我檢查雞翅策略有沒有問題」）
2. **影響分析** — 自動掃描 import 依賴、Pub/Sub 頻道、API 呼叫鏈
3. **Brainstorming** — 提出 2-3 個方案比較，在 Telegram 上逐一確認
4. **Writing Plans** — 產出詳細實作計畫，包含完整程式碼和驗證命令
5. **Subagent-Driven Development** — 每個 Task 分派獨立 Agent 實作
6. **部署 + /self-heal** — SSH 到 VM 部署，自動健康檢查

---

## 第一幕：Bug 修復

### Shioaji 雞翅鴨翅策略

起因是 Telegram 的一條訊息：「剛修了雞翅策略，但不確定是否正確，幫我檢查。」

Claude Code 用 `code-reviewer` 子 Agent 深入分析了兩個 commits 的修復，發現 **6 個問題**：

| 嚴重程度 | 問題 |
|---------|------|
| Critical | 有持倉結算路徑 `current_cycle_id` 清除可能被靜默跳過 |
| Critical | `strategy_engine.py` 硬寫 Redis key（6 處），繞過封裝 |
| Important | 結算時序 race condition（asyncio 協程切換點） |
| Important | 啟動掃描遺漏孤立 ACTIVE 週期 |
| Important | `reset_account_equity` 未清除持倉資料 |
| Refactor | 清理舊週期引用三個分支重複程式碼 |

修復策略是在 `SimManager` 新增 `save_account()` 統一入口，消除所有硬寫的 Redis key。部署後日誌確認孤立週期掃描成功清理了多個殘留的 ACTIVE 週期。

### IBAPI 芒格綜合分析

同樣透過 `code-reviewer` 子 Agent 審查，發現 **7 個問題**：

最嚴重的是 `news_service.py` 的 **DB Session 跨越長時間 LLM await**。LLM 分析需要 10-60 秒，但 DB Session 在整個 `hourly_scan` 的 `with` block 中持有，LLM 完成後的 `db.flush()` 可能操作已過期的 Session。

修復方式：`_auto_analyze` 在 LLM 呼叫前先提取所需資料（news_id、title 等純值），LLM 完成後開啟新的獨立 Session 寫入結果。

---

## 第二幕：芒格 Agent 動態分析架構

這是這一天最大的工程。起因是我對芒格系統的反省：

> 我原本的預期是它可以像查理芒格那樣透過外在環境足夠多的因素去自我學習。

### 系統現狀分析

Claude Code 用 `code-explorer` 子 Agent 深入分析了整個 Munger 系統（13 個服務模組、10+ 個 DB 表），產出了完整的能力清單和缺口分析。

**三個結構性缺陷**：

1. **調權學習不持久** — `WeightTuner` 用 `importlib` 修改記憶體中的 dict，重啟後學習成果全部歸零
2. **學習信號太窄** — 反應追蹤只追蹤 ZB 一個資產，但系統分析 8 個資產
3. **知識反饋閉環斷裂** — LLM 回傳的知識驗證反饋從未被回寫到知識庫

**vs LangGraph 的差距**：
- 沒有動態工具選擇（每次走固定管線）
- 沒有多輪自主推理（一攻一守固定 3 步）
- 沒有跨分析狀態記憶
- Prompt 結構不會演化

### 設計決策

在 Telegram 上進行了 4 輪問答，確定了方案：

- **混合架構** — 現有 API/排程/前端不動，核心分析引擎替換為 Agent 模組
- **自建 StateGraph** — 不引入 LangGraph 框架，自建約 300 行核心程式碼
- **可配置主控 LLM** — 預設 Claude，可線上切換
- **保留遷移路徑** — 未來需要時可低成本遷移到 LangGraph

### Agent 架構

![芒格 Agent 架構](/assets/images/2026-03-28/munger-agent-architecture.svg)

核心概念：

```
MungerAgent = Router LLM + Tool Registry + AgentState + Loop Control
```

**Router LLM** 扮演查理芒格的角色，看當前收集的資料決定「下一步要查什麼」或「已經夠了，產出結論」。每輪最多呼叫 2 個工具，最多 5 輪，120 秒超時。

**10 個工具**各自封裝現有服務：殖利率曲線、流動性快照、COT 持倉、知識庫搜尋、因果鏈傳導、經濟日曆、Price-In 模式、VIX 期限結構、深度 LLM 分析、市場注意力信號。

新增工具只需建檔 + 繼承 `AgentTool` + 註冊，不改 Agent 核心。

### 新聞注意力信號

一個重要的新機制：當同一主題在一天內被多次報導時，系統不再每篇都觸發 LLM 分析，而是聚類計數。

- 1 篇：正常分析
- 2 篇同來源：只計數不分析（同事件不同角度）
- 3+ 篇多來源：標記為「高注意力」，觸發一次 Agent 分析
- 10+ 篇：標記為「飽和」（可能已 price-in）

Agent 分析時可呼叫 `check_market_attention` 工具，比對同時段的市場價格波動，判斷「市場是否真的在意這個事件」。

---

## 第三幕：實作 — Subagent-Driven Development

10 個 Task 的實作採用 **Subagent-Driven Development** 模式：每個 Task 分派一個獨立的 Subagent 實作，完成後進行 Spec 合規審查和程式碼品質審查。

實作過程中發現一個有趣的 **啟動順序陷阱**：

權重載入一開始放在 `_activate_services()`（只有 IB 連線成功才呼叫），週末 IB 不運行就不會執行。等於學習成果的載入依賴於一個不相關的條件（IB 是否在線）。修到 `startup()` 後（DB 就緒即可），週末也能正確初始化。

**啟動順序 bug 是最難發現的 bug 之一，因為它只在特定條件下出現。**

---

## 數據統計

| 指標 | 數值 |
|------|------|
| 專案數 | 2（Shioaji + IBAPI） |
| Commits | 30+ |
| 新增檔案 | 14 |
| 修改檔案 | 19 |
| 新增程式碼行數 | ~1,700 |
| 新增 DB 表 | 4 |
| 新增 API 端點 | 4 |
| Agent 工具 | 10 |
| 部署次數 | 8 |
| 發現並修復的 bug | 15 |

---

## 心得與反思

### AI 輔助開發的價值

最大的價值不是「AI 幫你寫程式碼」，而是 **AI 幫你看見你看不到的東西**：

- `code-reviewer` 發現的 race condition 和封裝洩漏，是人眼很容易遺漏的
- 影響分析自動掃描 import 依賴鏈，避免改 A 壞 B
- 自動化的部署驗證閉環，確保每次修改都通過健康檢查

### 從固定管線到動態 Agent

查理芒格的核心不是「知道很多」，而是「知道什麼時候該用什麼」。固定管線就像一個只會用錘子的人，動態 Agent 才能根據問題選擇工具。

但 Agent 的價值需要時間驗證。我們設計了 A/B 比對機制：前 30 天同時運行 Agent 和傳統管線，比對準確率。如果 Agent 不如傳統，自動 fallback。

### 學習持久化是一切的基礎

再聰明的系統，如果每次重啟都失去記憶，就永遠無法累積經驗。修好調權持久化、知識反饋閉環這些「無聊」的基礎設施，才是讓系統能真正「自我學習」的前提。

---

## 未來方向

- **跨分析記憶** — 讓 Agent 看到「上次同類事件我的判斷和結果」
- **Router Prompt 演化** — 週回顧自動分析工具使用模式，生成直覺補充
- **外在因素擴展** — Put/Call ratio、非美央行、信貸市場、投資者情緒
- **LangGraph 遷移** — 若需要 streaming 或 human-in-the-loop，預估 2-3 天遷移
