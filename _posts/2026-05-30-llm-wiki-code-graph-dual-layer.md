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

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="340" fill="#f8fafc" rx="16"/>

  <!-- raw/ box -->
  <rect x="30" y="30" width="290" height="270" rx="12" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="175" y="58" text-anchor="middle" font-size="15" font-weight="700" fill="#92400e">raw/</text>
  <text x="175" y="76" text-anchor="middle" font-size="11" fill="#b45309">不可變原始資料層（人類寫入）</text>

  <rect x="50" y="90" width="250" height="46" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="175" y="110" text-anchor="middle" font-size="13" font-weight="600" fill="#78350f">devdiary/</text>
  <text x="175" y="126" text-anchor="middle" font-size="11" fill="#92400e">每日踩坑、決策、架構日誌</text>

  <rect x="50" y="148" width="250" height="46" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="175" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#78350f">specs/</text>
  <text x="175" y="184" text-anchor="middle" font-size="11" fill="#92400e">模組設計規格文件</text>

  <rect x="50" y="206" width="250" height="46" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="175" y="226" text-anchor="middle" font-size="13" font-weight="600" fill="#78350f">articles/</text>
  <text x="175" y="242" text-anchor="middle" font-size="11" fill="#92400e">收藏文章、書摘、外部資料</text>

  <text x="175" y="282" text-anchor="middle" font-size="10" fill="#d97706">✦ 只可新增，不可改寫</text>

  <!-- ingest arrow -->
  <line x1="322" y1="170" x2="430" y2="170" stroke="#7c3aed" stroke-width="2.5" marker-end="url(#arrow)"/>
  <rect x="324" y="148" width="102" height="44" rx="8" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="375" y="166" text-anchor="middle" font-size="12" font-weight="700" fill="#4c1d95">LLM</text>
  <text x="375" y="182" text-anchor="middle" font-size="11" fill="#5b21b6">Ingest</text>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7c3aed"/>
    </marker>
  </defs>

  <!-- wiki/ box -->
  <rect x="440" y="30" width="290" height="270" rx="12" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="585" y="58" text-anchor="middle" font-size="15" font-weight="700" fill="#1e3a8a">wiki/</text>
  <text x="585" y="76" text-anchor="middle" font-size="11" fill="#1d4ed8">LLM 編譯的知識層（Agent 擁有）</text>

  <rect x="460" y="90" width="250" height="46" rx="8" fill="#eff6ff" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="585" y="110" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">概念/</text>
  <text x="585" y="126" text-anchor="middle" font-size="11" fill="#1d4ed8">提煉後的概念頁面</text>

  <rect x="460" y="148" width="250" height="46" rx="8" fill="#eff6ff" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="585" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">系統/</text>
  <text x="585" y="184" text-anchor="middle" font-size="11" fill="#1d4ed8">系統架構知識</text>

  <rect x="460" y="206" width="250" height="46" rx="8" fill="#eff6ff" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="585" y="226" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">失敗模式/</text>
  <text x="585" y="242" text-anchor="middle" font-size="11" fill="#1d4ed8">結構化的錯誤教訓</text>

  <text x="585" y="282" text-anchor="middle" font-size="10" fill="#2563eb">✦ LLM 重寫，非 raw 副本</text>
</svg>
</figure>

有一條鐵律：`raw/` 的內容永遠不能直接複製到 `wiki/`。`wiki/` 必須是 LLM 重寫後的結果，不是原始資料的副本。違反這條規則會讓 `wiki/` 退化成一個結構差的鏡像，而不是真正的知識提煉。

### 3.3 Ingest Pipeline

1. **掃描** — LLM 讀取 `raw/` 中未處理的新檔案，判斷哪些值得加入知識庫
2. **分類處理**
   - 全新概念 → 從模板建立新的 wiki 頁面
   - 既有概念有新資料 → 追加觀察紀錄，重寫「核心結論」段落
3. **更新索引** — 寫入 `wiki/index.md`（頁面清單）和 `wiki/log.md`（本次處理了哪些 raw、影響哪些 wiki）

這樣設計的理由：

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

在排序時，系統用 LEFT JOIN 查詢 evergreen 清單，再用 CASE WHEN 決定是否套用衰減：

- **在 evergreen 清單中** → 直接用原始 cosine similarity，不乘任何係數
- **不在清單中** → 乘以 `exp(-λ × age_days)`，時間越久分數越低

這樣 evergreen 的知識永遠保持它應得的排名，而時效性知識隨時間自然淡出。

適合加入 evergreen 清單的概念類型：
- 技術指標定義（VIX、Sharpe Ratio、Delta/Gamma/Vega 等 Greeks）
- 數學公式與統計方法（Kelly 公式、共整合、半衰期估計）
- 系統設計原則（事件驅動、CQRS、高內聚低耦合）
- 不隨市況改變的歷史教訓

---

## 6. 自動化工作流程

把三個層（Wiki、Code Graph、時間感知搜尋）整合在一起，日常運作是這樣的：

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="280" fill="#f8fafc" rx="16"/>
  <text x="380" y="30" text-anchor="middle" font-size="14" font-weight="700" fill="#1e293b">日常運作流程</text>

  <!-- Step boxes -->
  <!-- Step 1 -->
  <rect x="20" y="50" width="128" height="180" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="84" y="76" text-anchor="middle" font-size="20" fill="#92400e">①</text>
  <text x="84" y="100" text-anchor="middle" font-size="12" font-weight="700" fill="#78350f">原始資料</text>
  <text x="84" y="118" text-anchor="middle" font-size="10" fill="#92400e">開發 / 學習</text>
  <text x="84" y="134" text-anchor="middle" font-size="10" fill="#92400e">活動產生</text>
  <text x="84" y="154" text-anchor="middle" font-size="10" fill="#b45309">raw/devdiary/</text>
  <text x="84" y="170" text-anchor="middle" font-size="10" fill="#b45309">raw/specs/</text>

  <!-- Arrow 1→2 -->
  <path d="M150,140 L168,140" stroke="#94a3b8" stroke-width="2" marker-end="url(#a2)"/>
  <defs>
    <marker id="a2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8"/>
    </marker>
  </defs>

  <!-- Step 2 -->
  <rect x="170" y="50" width="128" height="180" rx="10" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="234" y="76" text-anchor="middle" font-size="20" fill="#4c1d95">②</text>
  <text x="234" y="100" text-anchor="middle" font-size="12" font-weight="700" fill="#4c1d95">LLM Ingest</text>
  <text x="234" y="118" text-anchor="middle" font-size="10" fill="#5b21b6">掃描 raw/</text>
  <text x="234" y="134" text-anchor="middle" font-size="10" fill="#5b21b6">產出 / 更新</text>
  <text x="234" y="150" text-anchor="middle" font-size="10" fill="#5b21b6">wiki/ 頁面</text>
  <text x="234" y="170" text-anchor="middle" font-size="10" fill="#7c3aed">手動觸發</text>

  <!-- Arrow 2→3 -->
  <path d="M300,140 L318,140" stroke="#94a3b8" stroke-width="2" marker-end="url(#a2)"/>

  <!-- Step 3 -->
  <rect x="320" y="50" width="128" height="180" rx="10" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="384" y="76" text-anchor="middle" font-size="20" fill="#1e3a8a">③</text>
  <text x="384" y="100" text-anchor="middle" font-size="12" font-weight="700" fill="#1e3a8a">圖譜同步</text>
  <text x="384" y="118" text-anchor="middle" font-size="10" fill="#1d4ed8">重建 graph</text>
  <text x="384" y="134" text-anchor="middle" font-size="10" fill="#1d4ed8">增量 embedding</text>
  <text x="384" y="150" text-anchor="middle" font-size="10" fill="#1d4ed8">refresh</text>
  <text x="384" y="170" text-anchor="middle" font-size="10" fill="#2563eb">wiki 更新後觸發</text>

  <!-- Arrow 3→4 -->
  <path d="M450,140 L468,140" stroke="#94a3b8" stroke-width="2" marker-end="url(#a2)"/>

  <!-- Step 4 -->
  <rect x="470" y="50" width="128" height="180" rx="10" fill="#d1fae5" stroke="#059669" stroke-width="1.5"/>
  <text x="534" y="76" text-anchor="middle" font-size="20" fill="#064e3b">④</text>
  <text x="534" y="100" text-anchor="middle" font-size="12" font-weight="700" fill="#064e3b">Code Relink</text>
  <text x="534" y="118" text-anchor="middle" font-size="10" fill="#065f46">掃描 code symbols</text>
  <text x="534" y="134" text-anchor="middle" font-size="10" fill="#065f46">name + embedding</text>
  <text x="534" y="150" text-anchor="middle" font-size="10" fill="#065f46">含時間衰減排序</text>
  <text x="534" y="170" text-anchor="middle" font-size="10" fill="#059669">每週一次</text>

  <!-- Arrow 4→5 -->
  <path d="M600,140 L618,140" stroke="#94a3b8" stroke-width="2" marker-end="url(#a2)"/>

  <!-- Step 5 -->
  <rect x="620" y="50" width="120" height="180" rx="10" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
  <text x="680" y="76" text-anchor="middle" font-size="20" fill="#334155">⑤</text>
  <text x="680" y="100" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">Agent 查詢</text>
  <text x="680" y="118" text-anchor="middle" font-size="10" fill="#475569">wiki 搜尋</text>
  <text x="680" y="134" text-anchor="middle" font-size="10" fill="#475569">（時間感知）</text>
  <text x="680" y="154" text-anchor="middle" font-size="10" fill="#475569">code graph</text>
  <text x="680" y="170" text-anchor="middle" font-size="10" fill="#475569">查詢</text>
  <text x="680" y="190" text-anchor="middle" font-size="10" fill="#64748b">工作時即時</text>

  <!-- Bottom labels -->
  <text x="380" y="255" text-anchor="middle" font-size="10" fill="#94a3b8">① 持續 → ② 定期 → ③④ 同步 → ⑤ 即時</text>
</svg>
</figure>

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
