---
title: "自癒式開發流程：AI 驅動的衍生品交易系統開發實踐"
date: 2026-03-28
categories:
  - 技術
tags:
  - AI
  - Claude Code
  - DevOps
  - 開發流程
  - 交易系統
excerpt: "一套以 Claude Code + Telegram 為核心的自癒開發流程，從需求分析到部署驗證形成完整閉環。每個 bug 都會被提煉成防護規則，每次部署都會自動診斷修復。"
toc: true
toc_sticky: true
mermaid: true
---

## 前言

我維護兩套衍生品交易系統 — **Shioaji**（台灣期貨選擇權，15 個微服務）和 **IBAPI**（美國期貨選擇權，FastAPI 單體）。過去半年的開發中，我逐步建立了一套**自癒式開發流程**，核心原則是：

> **需求即測試、自動診斷、自癒修復、知識沉澱。**

這套流程的「自癒」不只是指系統的自動恢復，更是指**開發流程本身會從錯誤中學習並防止重蹈覆轍**。

---

## 流程全景

<div style="width:100%;overflow-x:auto;">
  <img src="/assets/images/2026-03-28/self-healing-overview.svg" alt="自癒式開發流程全景" style="width:100%;min-width:800px;display:block;">
</div>

**最低要求**：Phase 0 + 實作 + Phase 4（影響分析 + 實作 + 自癒驗證）

**完整要求**：全部 Phase（跨服務或前端變更時）

---

## Phase 0：影響分析（修改前必做）

每次接到需求後，**寫程式碼之前**先掃描影響範圍。

```mermaid
flowchart LR
    A[識別變更檔案] --> B[Import 依賴掃描]
    B --> C[Pub/Sub 頻道掃描]
    C --> D[API 呼叫鏈掃描]
    D --> E[前端影響掃描]
    E --> F[產出影響報告]

    style A fill:#4facfe,stroke:#333,color:#fff
    style F fill:#43e97b,stroke:#333,color:#fff
```

實際執行的掃描命令：

```bash
# 對每個被修改的模組，掃描誰依賴它
grep -rn "from X import\|import X" --include="*.py"

# 掃描 Pub/Sub 頻道的所有 publisher 和 consumer
grep -rn "publish\|subscribe\|CHANNEL" --include="*.py"

# 找出 API route 定義和內部 HTTP 呼叫
grep -rn "@router\." --include="*.py"
```

### 為什麼需要影響分析？

**慘痛案例**：v1.58.2 將 Redis Stream 遷移到 Pub/Sub 時，改了 `data` 格式但**漏改 MUD 和 KBar 的消費者**，導致全部 tick 被丟棄。如果當時做了影響分析，就會發現 `quote:tick` 頻道有 5 個消費者需要同步更新。

---

## Phase 2：實作 + Brainstorming 設計

### 小型修復：直接修

對於 bug 修復或小幅調整，跳過設計直接實作。但遵守一個原則：**發現問題直接修，不只是回報問題。**

### 大型功能：Brainstorming → Plan → Subagent

對於架構級變更，走完整設計流程：

```mermaid
flowchart TD
    A[Brainstorming] --> B{需要視覺化?}
    B -->|是| C[Mermaid / SVG 設計圖]
    B -->|否| D[文字方案比較]
    C --> E[Telegram 逐段確認]
    D --> E
    E --> F[Writing Plans]
    F --> G[Subagent-Driven Dev]

    subgraph "每個 Task"
        G --> H[Implementer Agent]
        H --> I[Spec Review]
        I --> J[Code Quality Review]
        J --> K[Commit]
    end

    style A fill:#f093fb,stroke:#333,color:#fff
    style F fill:#4facfe,stroke:#333,color:#fff
    style G fill:#43e97b,stroke:#333,color:#fff
```

**Brainstorming** 的核心是提出 2-3 個方案比較，在 Telegram 上逐一確認。重要的是讓使用者做**設計決策**，而不是全部交給 AI。

**Subagent-Driven Development** 的每個 Task 由獨立 Agent 實作，彼此的 context 互不干擾。完成後經過兩階段 review：先確認是否符合 spec，再檢查程式碼品質。

---

## 任務完成流程（每次修改必走）

不管改動大小，完成後都要走完這個閉環：

```mermaid
flowchart LR
    A[版號 +1] --> B[CHANGELOG]
    B --> C[git commit]
    C --> D[git push]
    D --> E[SSH 部署 VM]
    E --> F[等 30 秒]
    F --> G[/health-check]
    G --> H{healthy?}
    H -->|是| I[/self-heal]
    H -->|否| J[讀日誌修復]
    J --> A

    style A fill:#ffa94d,stroke:#333
    style E fill:#4facfe,stroke:#333,color:#fff
    style I fill:#f5576c,stroke:#333,color:#fff
```

```bash
# 1. 版號 + CHANGELOG
# VERSION, frontend/package.json, CHANGELOG.md 同步更新

# 2. Commit + Push
git add <files> && git commit -m "fix/feat: 描述"
git push origin main

# 3. 部署到 VM
ssh user@192.168.50.194 "cd /home/user/ShioajiPy && git pull && \
  docker compose build <service> && docker compose up -d <service>"

# 4. 等待 + 健康檢查
sleep 30
ssh user@192.168.50.194 "docker ps --format '{{.Names}} {{.Status}}' | grep shioaji"
```

---

## Phase 4：/self-heal 自癒驗證

這是整個流程最核心的部分。每次部署後自動執行：

```mermaid
flowchart TD
    A[Step 1: 全服務健康檢查] --> B{全部 healthy?}
    B -->|否| C[讀取不健康服務日誌]
    B -->|是| D[Step 2: Seq/Docker 錯誤查詢]
    C --> D
    D --> E{有 Error?}
    E -->|否| F[Step 7: 數據流驗證]
    E -->|是| G[Step 3: Tempo 追蹤]
    G --> H[Step 4: 修復路徑判斷]
    H --> I{Code bug?}
    I -->|是| J[Step 5: 自動修復 + 部署]
    I -->|否| K[環境問題，報告停止]
    J --> L[Step 6: 重新驗證]
    L --> M{修好了?}
    M -->|否| N{迭代 > 3?}
    N -->|是| O[Telegram 告警]
    N -->|否| H
    M -->|是| F
    F --> P[Step 8: 產出報告]

    style A fill:#4facfe,stroke:#333,color:#fff
    style J fill:#ffa94d,stroke:#333
    style O fill:#f5576c,stroke:#333,color:#fff
    style P fill:#43e97b,stroke:#333,color:#fff
```

### 自癒的三個層次

1. **容器層**：檢查 Docker 容器狀態（Running / Healthy / Restarting）
2. **日誌層**：從 Seq 結構化日誌和 Docker logs 中抓取 Error + TraceId
3. **修復層**：根據錯誤類型分類（Code bug / Format mismatch / Connection issue），自動定位檔案並修復

### 修復分類規則

| 錯誤模式 | 分類 | 修復方式 |
|---------|------|---------|
| `TypeError`, `AttributeError` | Code bug | 修正 Python 邏輯 |
| `JSONDecodeError`, `unexpected type` | Format mismatch | 修正 serializer + 加 isinstance 兼容 |
| `ConnectionRefusedError` | Connection issue | 檢查服務依賴 |
| External API 4xx/5xx | Environment | 報告並停止（非我方問題） |

### 最大重試 3 次

自癒循環最多執行 3 次。超過時發送 Telegram 告警：

```
自癒失敗告警
已嘗試 3 次修復但仍有錯誤

錯誤摘要：{error_summary}
最後嘗試的修復：{last_fix_description}

請人工介入處理
```

---

## Phase 5：知識沉澱

每個 bug 修復後，提煉成 **防護規則**寫入 CLAUDE.md。目前已累積 8 條規則：

```mermaid
mindmap
  root((歷史 Bug<br/>防護規則))
    共享狀態寫入
      必須過濾來源
      保留既有欄位
    多腿交易參數
      禁止依賴預設值
      grep 所有呼叫端
    定時任務三重守衛
      交易時段檢查
      數據新鮮度
      報價完整性
    Enum 全域同步
      全域搜尋 switch/match
      default/fallback 處理
    API 即時讀取
      優先 Redis
      考慮資料可用時機
    Pub/Sub 格式變更
      掃描全部消費者
      CHANGELOG 標記
    部署後健康檢查
      等 30 秒
      全部 healthy + 0 ERROR
    函式呼叫前完整閱讀
      列出所有職責
      拆分後選擇性呼叫
```

這些規則不是文件上的擺設 — 它們寫在 CLAUDE.md 中，AI 每次開發時都會讀取並遵守。**系統從過去的錯誤中學習，防止未來重蹈覆轍。**

---

## 跨系統的統一標準

兩套交易系統雖然技術棧不同（Shioaji: 微服務 + Redis / IBAPI: 單體 + PostgreSQL），但共享相同的開發流程：

| 項目 | Shioaji | IBAPI |
|------|---------|-------|
| 部署 | `docker compose build + up` | `docker compose up -d --build` |
| 健康檢查 | `/health-check` Skill | `/api/diagnostics` API |
| 自癒驗證 | `/self-heal`（Seq + Docker logs） | Seq + Diagnostics API |
| 版號管理 | `VERSION` + `frontend/package.json` | `config.py` + `frontend/package.json` |
| 通知 | Telegram MCP | Telegram EventBus |

統一的流程意味著不管在哪個專案工作，行為模式和品質標準都一致。

---

## Telegram 作為開發介面

整個流程的觸發和回饋都透過 Telegram：

```mermaid
sequenceDiagram
    participant U as 使用者 (Telegram)
    participant C as Claude Code
    participant V as VM (192.168.50.194)

    U->>C: 「幫我檢查雞翅策略有沒有問題」
    C->>C: code-reviewer 子 Agent 分析
    C->>U: 發現 6 個問題，需要修嗎？
    U->>C: 修理
    C->>C: 影響分析 → 實作 → 語法檢查
    C->>V: git push + SSH 部署
    V->>C: 容器狀態 + 日誌
    C->>C: /self-heal 驗證
    C->>U: ✅ 自癒驗證通過，0 錯誤
```

這種模式的好處是：**我可以在任何地方、任何裝置上下達開發指令**，不需要打開 IDE。設計決策在 Telegram 上討論確認，程式碼的撰寫、測試、部署全由 Claude Code 處理。

---

## 實際成效

以 2026-03-28 這一天為例：

| 指標 | 數值 |
|------|------|
| 跨越的專案 | 2（Shioaji + IBAPI） |
| Commits | 30+ |
| 發現的 bug | 15 |
| 修復的 bug | 15 |
| 部署次數 | 8 |
| 自癒迭代 | 2 次（啟動順序 bug 需要第二次修復） |
| 新增防護規則 | 3 條 |

---

## 經驗總結

### 1. 自癒的本質是閉環

「寫完部署就結束」是最常見的開發反模式。自癒流程強制要求每次部署後都驗證，驗證失敗就自動修復，修復後再驗證。**沒有通過驗證就不結束任務。**

### 2. 知識沉澱比修 bug 更重要

修一個 bug 是一次性的，但把它提煉成防護規則是永久的。CLAUDE.md 中的 8 條規則，每一條都源自真實的線上事故。

### 3. 影響分析是最被低估的步驟

「我只改了一行」是事故的起點。Pub/Sub 格式變更、Enum 新增值、Redis key 重命名 — 這些「小改動」如果沒有掃描所有消費者，就會在你意想不到的地方引爆。

### 4. AI 的價值在於看見盲點

code-reviewer 發現的 race condition 和封裝洩漏，是人眼 code review 容易遺漏的。讓 AI 做系統性掃描，人做設計決策 — 這是目前最有效的分工模式。

---

## 下一篇預告

下一篇文章會介紹**芒格 Agent 動態分析架構** — 如何讓交易分析系統像查理芒格那樣，根據事件性質自主選擇分析工具和推理路徑，並透過持久化的學習機制不斷改進。
