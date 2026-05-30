---
title: "給 Agent 一張地圖：LLM Wiki × Code Graph 雙層知識系統設計"
date: 2026-05-30
categories:
  - 技術
tags:
  - AI
  - AgenticOps
  - 知識管理
  - RAG
  - LLM
  - Code Graph
  - 個人知識庫
excerpt: "LLM 只懂公開知識，不懂你的私有 context。這篇文章分享我用了將近半年打造的雙層知識系統：第一層是 Karpathy 風格的 LLM Wiki，第二層是程式碼知識圖譜。以及最近加入的時間感知排序——讓 Agent 在語意相近時優先選擇更新的知識。"
toc: true
toc_sticky: true
---

## 1. 問題：Agent 只懂公開知識

過去半年，我把越來越多的工程工作交給 AI Agent 執行——設計、coding、部署、驗證。整個流程跑起來之後，我發現一個反覆出現的摩擦點：

**Agent 每次對話都從零開始。**

你踩過的坑、你的系統設計決策、模組之間的語意關係——這些都只存在你腦子裡，或散落在各種 commit message 之中。每次要讓 Agent 理解背景，都得重新解釋一遍，效率就在這個「重新解釋」的摩擦上流失。

更深的問題是：即便你每次都解釋，Agent 也沒有辦法把這些解釋「記住」並在下一個任務自動應用。對話結束就歸零。

這就是為什麼我需要一個**個人知識系統**——不是給人查的 wiki，而是給 Agent 用的外部記憶。

---

## 2. 核心哲學：給 Agent 一張地圖

在設計這個系統之前，我問自己一個問題：Agent 需要的是「答案」還是「地圖」？

直接給 Agent 答案的問題是：你不知道它在哪個任務裡需要哪個答案，所以你只能把所有東西塞進 context window——而 context 是有限的，而且越長越貴越慢。

更好的設計是：

> **系統擁有結構（穩定地址、graph 關係、heading 階層），Agent 擁有語義（決定哪段內容與當前任務相關）。**

這樣 Agent 可以自己查詢、自己決定要載入哪些知識，而不是被動接收你預先塞好的所有東西。

---

## 3. 第一層：LLM Wiki（Karpathy 風格）

### 3.1 設計靈感

受 Andrej Karpathy 的 LLM Wiki 概念啟發。他的主張是：

> **Wiki 不是人寫的，是 LLM 消化原始資料後二次產出的。**

人類負責產生原始資料（觀察、決策、踩坑記錄），LLM 負責提煉成結構化知識。這個分工讓知識庫能夠自動演化，而不需要人工整理。

### 3.2 三層架構

```
raw/          ← 不可變原始資料層（人類 + 外部系統寫入）
  devdiary/   ← 每日開發日誌、踩坑、架構決策
  specs/      ← 模組設計規格文件
  articles/   ← 收藏的文章、書摘、外部資料

wiki/         ← LLM 編譯的知識層（Agent 完全擁有）
  概念/       ← 提煉後的概念頁面
  系統/       ← 系統架構知識
  失敗模式/   ← 結構化的錯誤教訓
```

有一條鐵律：`raw/` 的內容永遠不能直接複製到 `wiki/`。`wiki/` 必須是 LLM 重寫後的結果，不是原始資料的副本。違反這條規則會讓 `wiki/` 退化成一個結構差的鏡像，而不是真正的知識提煉。

### 3.3 Ingest Pipeline

```
raw/ 新檔案
    ↓
LLM 掃描（哪些值得加入知識庫？）
    ↓
對候選項目：
  - 新概念 → 從模板建立 wiki 頁面
  - 既有概念 → 追加觀察紀錄 + 重寫核心結論段落
    ↓
更新 index.md + log.md（記錄處理了哪些 raw、影響哪些 wiki）
```

為什麼這樣設計？

- **Raw 是事實紀錄**，保留完整 context，不被 LLM 的「聰明」改寫
- **Wiki 是 LLM 的工作記憶**，用 LLM 自己的語言整理，查詢時自然更準確
- **兩層分離**讓 ingest 可以增量進行，不需要每次全量重建

---

## 4. 第二層：Code Graph（程式碼知識圖譜）

知識庫有了，但還缺少一個關鍵連結：

**這個函式，跟我的知識庫裡的哪個概念有關？**

當 Agent 在修改 `calculate_position_risk()` 這個函式時，它需要知道這個函式背後的設計思想在哪個 wiki 頁面——是「風險管理策略」，還是「保證金計算規則」，還是兩者都有？

### 4.1 Code Graph 做什麼

對程式碼庫進行靜態分析，提取所有 symbol（類別、函式、方法），建立 code symbol → wiki 概念的跨層連結：

| 欄位 | 說明 |
|------|------|
| symbol | 函式完整路徑（如 `services.risk.calculate_position_risk`） |
| wiki_concept | 連結到的 wiki 頁面名稱 |
| link_type | `name_match`（名稱匹配）或 `embedding_match`（語意匹配） |
| confidence_score | 連結信心度（0.0 ~ 1.0） |

### 4.2 兩種連結方法

**Method A：名稱匹配（零 API 成本，毫秒級）**

將 camelCase / kebab-case / snake_case 函式名稱分詞後，計算與 wiki 概念名稱的詞彙重疊率（max-containment）。`calculate_position_risk` → `calculate`, `position`, `risk` → 連結到「部位風險管理」。

適合大量快速建立初始連結，不需要 API 費用。

**Method B：語意嵌入（精準，需要 embedding API）**

用 embedding 模型將函式的 docstring 向量化，對 wiki 頁面的向量做 cosine 相似度搜尋（pgvector HNSW index）。

能找到名稱完全不相似、但語意高度相關的連結——比如 `on_order_filled_callback()` 跟「事件驅動架構設計原則」的連結，靠名稱匹配找不到，但透過 docstring 語意就能建立。

目前我的系統：
- Code symbols：4,402 個
- 總連結數：4,544 筆（name_match 2,672 + embedding_match 1,872）
- Symbol 覆蓋率：36.6%

---

## 5. 時間感知排序（Temporal Re-Ranking）

### 5.1 純語意搜尋的盲點

Cosine 相似度只有一個維度：語意角度。它不知道時間。

當你有兩個 wiki 頁面都在討論相同概念——一個是八個月前的舊分析，一個是上週更新的最新判斷——cosine 搜尋會給它們接近的分數。但你顯然更想要看新的。

這在知識快速迭代的領域（市場分析、系統架構判斷）特別重要：舊的洞見不只是「舊」，有時候是「已被推翻」。

### 5.2 解法：指數衰減

在 SQL 查詢的排序階段，對相似度分數乘以時間衰減係數：

```
score = similarity × exp(-λ × age_in_days)
```

這樣兩個概念的語意相近，更新的那個會因為 age 較小、衰減較少，自然排到前面。

λ（每日衰減率）的選擇：

| λ 值 | 30天後保留 | 180天後保留 | 適合場景 |
|------|-----------|------------|---------|
| 0.001 | 97% | 83% | 學術論文、穩定技術概念 |
| 0.003 | 91% | 58% | 業務知識、市場分析（我的預設值） |
| 0.005 | 86% | 41% | 快速迭代的產品決策 |

**關鍵設計決策**：衰減發生在 SQL 排序層，不修改向量本身。語意空間保持乾淨，只在最後排序時引入時間偏好。用 PostgreSQL 原生 `EXP()` + `EXTRACT(EPOCH FROM ...)` 計算，不需要額外程式邏輯。

### 5.3 Evergreen 概念

有些知識是永恆的——數學公式的定義、程式設計原則、系統架構的核心 trade-off。這些不應該因為「上次更新是兩年前」就被排到後面。

解法是一個 lookup table：`evergreen_concepts(concept_name, reason)`。

在排序 SQL 裡，用 LEFT JOIN + CASE WHEN 判斷：

```
如果在 evergreen list → 直接用原始 similarity（不衰減）
否則 → 乘以時間衰減係數
```

這樣 evergreen 的知識永遠保持它應得的排名，而時效性知識隨時間自然淡出。

---

## 6. 自動化工作流程

把三個層（Wiki、Code Graph、時間感知搜尋）整合在一起，日常運作是這樣的：

```
1. 開發 / 學習活動產生原始資料
   → 自動或手動寫入 raw/devdiary/、raw/specs/

2. 定期 ingest（手動觸發）
   → LLM 掃描 raw/，產出 / 更新 wiki/ 頁面

3. 知識圖譜同步
   → git pull wiki + 重建 in-memory graph（NetworkX + TF-IDF）
   → 增量 embedding refresh（只更新有變動的 wiki 段落）

4. Code-Wiki 重新連結（通常每週一次）
   → 靜態分析掃描所有 code symbols
   → 重算 name_match + embedding_match 連結（含時間衰減）

5. Agent 工作時的查詢
   → wiki 搜尋：語意 + 時間衰減排序 → 取相關概念
   → code graph 查詢：某函式連結到哪些 wiki 知識頁面
```

---

## 7. 三個設計原則的總結

**原則一：不給 Agent 答案，給它地圖**

系統提供可查詢的結構，Agent 在工作時自己決定要查什麼。這比把所有知識塞進 context 更節省 token，也讓 Agent 能根據任務動態組合知識。

**原則二：Raw 不可變，Wiki 可重寫**

原始資料的完整性比整潔重要。一條今天看起來「不重要」的 devdiary 記錄，六個月後可能是解釋一個奇怪 bug 的關鍵線索。Wiki 可以隨理解進化，但 raw 一旦寫下就不能改。

**原則三：向量 + 圖 + 時間，三軸搜尋**

- 語意（cosine）：解決「什麼相關」
- 圖遍歷（NetworkX）：解決「關聯什麼」
- 時間衰減：解決「哪個更新、哪個應該被優先」

三軸互補，任何一軸單獨都不夠。

---

## 8. 結語

這套系統真正的價值不在於搜尋速度，而在於：

**每次 bug 修復、每次架構決策、每次踩坑——都成為下一次 Agent 工作的先驗知識。**

知識庫隨系統一起生長，Agent 的協助品質也隨之提升。系統在運作，知識在累積，這是一個正向循環——而不是每個月要手動「更新文件」的苦差事。

這才是 AgenticOps 應該有的樣子：讓 AI 工具的使用本身，成為知識積累的過程。

---

*技術棧：PostgreSQL + pgvector、NetworkX、FastAPI。Embedding 功能使用可替換的向量化 API。*
