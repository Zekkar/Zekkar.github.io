---
title: "MindGraph：把私有知識變成 Agent 的外部記憶——一個 domain-agnostic 的知識圖譜引擎"
date: 2026-05-31
categories:
  - 技術
tags:
  - MindGraph
  - AI
  - AgenticOps
  - 知識管理
  - RAG
  - Knowledge Graph
  - pgvector
  - 開源
  - IntentRouter
excerpt: "LLM 只懂公開知識，不懂你的私有 context。我把為交易系統打造的知識系統抽取成 MindGraph——一個 domain-agnostic、provider-agnostic 的知識圖譜引擎：任意一疊 markdown 筆記丟進去，輸出可被 Agent 查詢的互連 wiki，結合圖遍歷、TF-IDF 關鍵字與 pgvector 語意搜尋。這篇談它的架構設計，以及把它推到 85.5% 程式碼覆蓋率的交易系統實戰。"
toc: true
toc_sticky: true
---

## 1. 問題：Agent 只懂公開知識

過去半年，我把越來越多的工程工作交給 AI Agent 執行——設計、coding、部署、驗證。整個流程跑起來之後，我發現一個反覆出現的摩擦點：

**Agent 每次對話都從零開始。**

你踩過的坑、你的系統設計決策、模組之間的語意關係——這些都只存在你腦子裡，或散落在各種 commit message 之中。每次要讓 Agent 理解背景，都得重新解釋一遍，效率就在這個「重新解釋」的摩擦上流失。

更深的問題是：即便你每次都解釋，Agent 也沒有辦法把這些解釋「記住」並在下一個任務自動應用。對話結束就歸零。

LLM 懂的是公開知識——它讀過整個網際網路，但它沒讀過**你的**系統。這就是為什麼需要一個**私有知識系統**：不是給人查的 wiki，而是給 Agent 用的外部記憶。

我最初為自己的交易系統打造了這套系統。它證明有效之後，我把與「交易」無關的核心抽取出來，做成一個獨立、領域無關的引擎——**MindGraph**。這篇文章講 MindGraph 的架構，以及它在交易系統這個重度案例裡被磨出來的設計。

---

## 2. MindGraph 是什麼

一句話：**把任意一個資料夾的 markdown 筆記，變成一個可被 Agent 查詢、彼此互連的知識圖譜。**

- **Domain-agnostic**：交易筆記、工程文件、研究論文、個人 wiki 都適用，引擎本身不綁任何領域
- **Provider-agnostic**：LLM 與 embedding 供應商靠 config 切換（Gemini / OpenAI / Anthropic）
- **Idempotent pipeline**：`ingest` 可重跑，沒變動的檔案直接跳過、零 API 呼叫
- **Hybrid retrieval**：關鍵字（TF-IDF）＋ 向量（pgvector cosine）＋ 圖（1-hop boost）三路合併
- **No lock-in**：純 markdown 進、純 markdown 出，圖在啟動時即時從檔案重建

它是一支 CLI 加一層 server：`mindgraph ingest` 把 `raw/` 編譯成 `wiki/`，`mindgraph search --hybrid` 做意圖感知檢索，`mindgraph serve` / `mindgraph mcp` 把知識庫以 REST 或 MCP 對外（給 Claude Code 當外部記憶），`mindgraph coverage` 量化「程式碼有多少被知識庫覆蓋」。MIT 授權，原始碼開源在 GitHub：**[Zekkar/mindgraph-engine](https://github.com/Zekkar/mindgraph-engine)**。

---

## 3. 核心哲學：給 Agent 一張地圖

在設計這個系統之前，我問自己一個問題：Agent 需要的是「答案」還是「地圖」？

直接給 Agent 答案的問題是：你不知道它在哪個任務裡需要哪個答案，所以你只能把所有東西塞進 context window——而 context 是有限的，而且越長越貴越慢。

更好的設計是：

> **系統擁有結構（穩定地址、graph 關係、heading 階層），Agent 擁有語義（決定哪段內容與當前任務相關）。**

這樣 Agent 可以自己查詢、自己決定要載入哪些知識，而不是被動接收你預先塞好的所有東西。MindGraph 的每一個設計決策都是這條哲學的延伸。

---

## 4. 引擎架構總覽

MindGraph 是一條從「原始筆記」流向「可排序檢索結果」的管線。資料源透過 adapter 進來，LLM 把它重寫成結構化 wiki，wiki 同時餵給圖引擎與向量庫，最後由 hybrid retriever 合併排序。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 500" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="500" fill="#f8fafc" rx="16"/>
  <defs>
    <marker id="eng-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#7c3aed"/></marker>
    <marker id="eng-g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/></marker>
  </defs>

  <!-- Data Sources -->
  <rect x="250" y="26" width="260" height="54" rx="10" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="380" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#075985">Data Sources（Adapter 層）</text>
  <text x="380" y="66" text-anchor="middle" font-size="10" fill="#0369a1">filesystem · custom · 未來：HTTP / DB</text>
  <line x1="380" y1="80" x2="380" y2="104" stroke="#7c3aed" stroke-width="2" marker-end="url(#eng-a)"/>
  <text x="392" y="96" font-size="10" fill="#6d28d9">fetch() → RawDocument[]</text>

  <!-- raw/ -->
  <rect x="250" y="104" width="260" height="54" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="380" y="126" text-anchor="middle" font-size="13" font-weight="700" fill="#92400e">raw/　原始資料層</text>
  <text x="380" y="144" text-anchor="middle" font-size="10" fill="#b45309">source of truth — LLM 永不改寫</text>
  <line x1="380" y1="158" x2="380" y2="182" stroke="#7c3aed" stroke-width="2" marker-end="url(#eng-a)"/>
  <text x="392" y="174" font-size="10" fill="#6d28d9">LLMProvider.complete(rewrite_prompt)</text>

  <!-- wiki/ -->
  <rect x="250" y="182" width="260" height="54" rx="10" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="380" y="204" text-anchor="middle" font-size="13" font-weight="700" fill="#1e3a8a">wiki/　LLM 編譯頁面</text>
  <text x="380" y="222" text-anchor="middle" font-size="10" fill="#1d4ed8">## 核心結論　+　[[wikilinks]]</text>

  <!-- split arrows -->
  <line x1="330" y1="236" x2="200" y2="280" stroke="#94a3b8" stroke-width="1.8" marker-end="url(#eng-g)"/>
  <line x1="430" y1="236" x2="560" y2="280" stroke="#94a3b8" stroke-width="1.8" marker-end="url(#eng-g)"/>

  <!-- left: graph -->
  <rect x="60" y="280" width="280" height="66" rx="10" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.8"/>
  <text x="200" y="304" text-anchor="middle" font-size="12" font-weight="700" fill="#4c1d95">NetworkX 圖 + TF-IDF 索引</text>
  <text x="200" y="322" text-anchor="middle" font-size="10" fill="#5b21b6">WikiGraphEngine.build()</text>
  <text x="200" y="338" text-anchor="middle" font-size="10" fill="#5b21b6">Louvain 社群偵測</text>

  <!-- right: pgvector -->
  <rect x="420" y="280" width="280" height="66" rx="10" fill="#d1fae5" stroke="#059669" stroke-width="1.8"/>
  <text x="560" y="304" text-anchor="middle" font-size="12" font-weight="700" fill="#064e3b">PostgreSQL pgvector</text>
  <text x="560" y="322" text-anchor="middle" font-size="10" fill="#065f46">EmbeddingStore.upsert()</text>
  <text x="560" y="338" text-anchor="middle" font-size="10" fill="#065f46">wiki.embeddings（cosine）</text>

  <!-- converge -->
  <line x1="200" y1="346" x2="330" y2="392" stroke="#94a3b8" stroke-width="1.8" marker-end="url(#eng-g)"/>
  <line x1="560" y1="346" x2="430" y2="392" stroke="#94a3b8" stroke-width="1.8" marker-end="url(#eng-g)"/>
  <text x="150" y="372" font-size="10" fill="#6d28d9">KeywordRetriever</text>
  <text x="540" y="372" font-size="10" fill="#047857">VectorRetriever</text>

  <!-- two_stage_hybrid -->
  <rect x="240" y="392" width="280" height="54" rx="10" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>
  <text x="380" y="414" text-anchor="middle" font-size="13" font-weight="700" fill="#854d0e">two_stage_hybrid()</text>
  <text x="380" y="432" text-anchor="middle" font-size="10" fill="#a16207">keyword 0.4 + vector 0.6　→　graph boost +0.1</text>
  <line x1="380" y1="446" x2="380" y2="468" stroke="#94a3b8" stroke-width="2" marker-end="url(#eng-g)"/>

  <!-- output -->
  <rect x="280" y="468" width="200" height="26" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
  <text x="380" y="485" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">Ranked ScoredDoc[]</text>
</svg>
</figure>

幾個關鍵設計決策：

| 決策 | 選擇 | 理由 |
|------|------|------|
| 圖後端 | NetworkX 記憶體圖 | 零外部依賴；< 500 頁時毫秒級重建 |
| 搜尋 | TF-IDF ＋ pgvector cosine | 關鍵字找精確詞，向量找語意相似 |
| 社群偵測 | Louvain | NetworkX 內建，20+ 節點就有意義 |
| Edge 信心 | 自動推斷 | `EXTRACTED`（wikilinks）> `INFERRED`（共享 tags） |
| 狀態追蹤 | `.ingest-state.json` + content hash | 重跑免費，只有變動的檔案才呼叫 LLM |
| 狀態寫入 | `os.replace()` temp-file 原子置換 | ingest 中途崩潰也不會壞掉 state 檔 |

---

## 5. 第一層：raw → wiki（Karpathy 風格 ingest）

### 5.1 設計靈感

受 Andrej Karpathy 的 LLM Wiki 概念啟發。他的主張是：

> **Wiki 不是人寫的，是 LLM 消化原始資料後二次產出的。**

人類負責產生原始資料（觀察、決策、踩坑記錄），LLM 負責提煉成結構化知識。這個分工讓知識庫能夠自動演化，而不需要人工整理。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="340" fill="#f8fafc" rx="16"/>
  <defs>
    <marker id="rw-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#7c3aed"/></marker>
  </defs>

  <!-- raw/ box -->
  <rect x="30" y="30" width="290" height="270" rx="12" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="175" y="58" text-anchor="middle" font-size="15" font-weight="700" fill="#92400e">raw/</text>
  <text x="175" y="76" text-anchor="middle" font-size="11" fill="#b45309">不可變原始資料層（人類寫入）</text>

  <rect x="50" y="90" width="250" height="46" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="175" y="110" text-anchor="middle" font-size="13" font-weight="600" fill="#78350f">notes/</text>
  <text x="175" y="126" text-anchor="middle" font-size="11" fill="#92400e">日誌、踩坑、決策紀錄</text>

  <rect x="50" y="148" width="250" height="46" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="175" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#78350f">specs/</text>
  <text x="175" y="184" text-anchor="middle" font-size="11" fill="#92400e">模組設計規格文件</text>

  <rect x="50" y="206" width="250" height="46" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="175" y="226" text-anchor="middle" font-size="13" font-weight="600" fill="#78350f">articles/</text>
  <text x="175" y="242" text-anchor="middle" font-size="11" fill="#92400e">收藏文章、書摘、外部資料</text>

  <text x="175" y="282" text-anchor="middle" font-size="10" fill="#d97706">✦ 只可新增，不可改寫</text>

  <!-- ingest arrow -->
  <line x1="322" y1="170" x2="430" y2="170" stroke="#7c3aed" stroke-width="2.5" marker-end="url(#rw-a)"/>
  <rect x="324" y="148" width="102" height="44" rx="8" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="375" y="166" text-anchor="middle" font-size="12" font-weight="700" fill="#4c1d95">LLM</text>
  <text x="375" y="182" text-anchor="middle" font-size="11" fill="#5b21b6">Ingest（重寫）</text>

  <!-- wiki/ box -->
  <rect x="440" y="30" width="290" height="270" rx="12" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="585" y="58" text-anchor="middle" font-size="15" font-weight="700" fill="#1e3a8a">wiki/</text>
  <text x="585" y="76" text-anchor="middle" font-size="11" fill="#1d4ed8">LLM 編譯的知識層（Agent 擁有）</text>

  <rect x="460" y="90" width="250" height="46" rx="8" fill="#eff6ff" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="585" y="110" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">概念頁面</text>
  <text x="585" y="126" text-anchor="middle" font-size="11" fill="#1d4ed8">## 核心結論 + [[wikilinks]]</text>

  <rect x="460" y="148" width="250" height="46" rx="8" fill="#eff6ff" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="585" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">系統架構頁</text>
  <text x="585" y="184" text-anchor="middle" font-size="11" fill="#1d4ed8">提煉後的系統知識</text>

  <rect x="460" y="206" width="250" height="46" rx="8" fill="#eff6ff" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="585" y="226" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">失敗模式頁</text>
  <text x="585" y="242" text-anchor="middle" font-size="11" fill="#1d4ed8">結構化的錯誤教訓</text>

  <text x="585" y="282" text-anchor="middle" font-size="10" fill="#2563eb">✦ LLM 重寫，非 raw 副本</text>
</svg>
</figure>

有一條鐵律：`raw/` 的內容永遠不能直接複製到 `wiki/`。`wiki/` 必須是 LLM 重寫後的結果，不是原始資料的副本。違反這條規則會讓 `wiki/` 退化成一個結構差的鏡像，而不是真正的知識提煉。

### 5.2 Ingest 狀態機

MindGraph 的 ingest 是 **idempotent** 的——每個檔案的處理狀態存在 `.ingest-state.json`，用 content hash 判斷是否需要重跑：

```
[新檔 / 內容變動]
       │
       ▼
  pending ──(LLM 成功)──> ingested ──(下次 hash 相同)──> skipped
       │
       └──(LLM 失敗)──> failed ──(下次重試)──> ...
```

第二次跑 ingest 時，沒變的檔案直接進 `skipped` 計數、零 API 呼叫。狀態寫入用 `os.replace()` 做原子置換，所以即使在 ingest 中途崩潰，state 檔也不會被寫壞。

這樣設計的理由：

- **Raw 是事實紀錄**，保留完整 context，不被 LLM 的「聰明」改寫
- **Wiki 是 LLM 的工作記憶**，用 LLM 自己的語言整理，查詢時自然更準確
- **兩層分離 + 增量狀態**讓 ingest 可以反覆增量進行，不需要每次全量重建

---

## 6. 第二層：圖 + 向量混合檢索

知識編譯好了，真正的價值在「怎麼查得準」。MindGraph 把三種互補的檢索方式合成一條管線。

> ⚙️ **v0.2.0 起已接線**：下面描述的 `two_stage_hybrid`（圖 + 向量合併）與第 7 節的 IntentRouter 現在都已接上——`mindgraph search --hybrid` 走完整的意圖感知混合檢索，REST 的 `/api/smart_search` 與 MCP 的 `smart_search` tool 也都用它（沒有 DB／金鑰時自動降級成純 TF-IDF）。不加 `--hybrid` 的預設 `mindgraph search` 仍是輕量純關鍵字。

### 6.1 圖：WikiGraphEngine

每個 wiki 頁面是一個節點，邊則自動從內容推斷出三個層級：

| 信心 | 來源 | 範例 |
|------|------|------|
| `EXTRACTED` | 內文 `[[wikilinks]]` | PageA 內含 `[[PageB]]` |
| `EXTRACTED` | frontmatter `related:` | `related: [PageB]` |
| `INFERRED` | 共享非泛用 tags | 兩頁都有 tag `machine-learning` |

建圖後跑 Louvain 社群偵測，自動把相關概念分群。圖不持久化——< 500 頁時即時重建只要毫秒，省掉一整套同步邏輯。

### 6.2 向量：EmbeddingStore（pgvector）

每個 wiki 頁面在 H2/H3/H4 heading 處切成 `Section` chunk，逐塊 embedding，upsert 進 `wiki.embeddings`，用 `UNIQUE(concept_name, section_id, model_version)` 去重。查詢時用 pgvector 的 cosine：`1 - (embedding <=> query_vec)`。

能找到名稱完全不相似、但語意高度相關的內容——比如 `on_order_filled_callback()` 跟「事件驅動架構設計原則」靠名稱匹配找不到，但透過 docstring 語意就能連起來。

### 6.3 合併：two_stage_hybrid

兩種檢索器各跑一輪，分數正規化後加權合併（預設 keyword 0.4 / vector 0.6），再做一層圖 boost：

- **Stage 1**：keyword + vector 各取 over-fetch（`max(top_k × 3, 15)`，至少 15 筆），分數正規化後合池加權
- **Stage 2（圖 boost）**：對 stage 1 的每個候選查 1-hop 鄰居，若某候選有「兩個以上」鄰居同時也落在候選集合裡，才給它 `+0.1`（只有單一共現鄰居不加分）——意思是「這個概念跟多個同時命中的概念在圖上相連，更可能是正確答案的核心」
- **降級保護**：向量庫掛掉時 `degradation = "vector_unavailable_fallback_to_keyword"`，**檢索不中斷**，只退化成純關鍵字。低於 `min_score = 0.15` 的結果被濾掉

回傳不只是結果清單，還有 `interpretation`（人話解讀最高分命中）和 `suggestions`（建議的下一步查詢），讓 Agent 拿到的是「可行動的檢索結果」而非裸資料。

### 6.4 一個衍生應用：用知識覆蓋率量化程式碼邊界

既然 wiki 是知識的權威來源，那「有多少程式碼模組被知識庫覆蓋」就是一個有意義的指標。`mindgraph coverage` 掃描一個 codebase，回報哪些模組在 `wiki/` 裡被引用：

```
覆蓋率 = 被 wiki 引用 ≥ N 次的模組數 / 掃描到的總模組數
```

支援 file-level 與 `--service-level`（把頂層目錄當服務單位掃）、`--json`（給 CI gate 用）。它實作的原則是：**知識覆蓋率＝程式碼模組是否被第一層 wiki 知識引用，而不是 wiki 頁面的數量。** 後面的案例研究會看到這個指標怎麼從 45% 推到 85.5%。

---

## 7. 搜尋層：意圖感知路由（IntentRouter）

### 7.1 問題：一刀切的 hybrid search 不夠用

固定權重的 keyword + vector 混合搜尋，對不同意圖的查詢效果差異很大：

| 意圖類型 | 查詢範例 | 最佳策略 |
|----------|---------|---------|
| location | 「驗證邏輯在哪個檔案？」 | TF-IDF 關鍵字（符號名精準匹配） |
| concept | 「依賴注入是什麼？」 | 向量相似度（語意理解） |
| relation | 「快取跟資料層有什麼關係？」 | 圖遍歷 + 向量（節點間關聯） |
| failure | 「連線逾時怎麼修？」 | 向量 + 失敗模式頁面優先 |

用同一套配置處理所有意圖，就是在用鐵鎚釘每一種釘子。

### 7.2 解法：兩層 Pass 架構

**Pass 1：規則分類（zero latency，零 token）**

IntentRouter 用正規表達式分析查詢字串，對四種意圖各自累計命中數，取最高者為意圖、`min(命中數 / 2, 1.0)` 為信心分。毫秒級，不呼叫任何 API：

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="320" fill="#f8fafc" rx="16"/>
  <text x="380" y="26" text-anchor="middle" font-size="14" font-weight="700" fill="#1e293b">Pass 1：IntentRouter 意圖分類</text>
  <defs>
    <marker id="ir1" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill="#94a3b8"/></marker>
    <marker id="ir2" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill="#a855f7"/></marker>
  </defs>
  <rect x="280" y="36" width="200" height="40" rx="10" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <text x="380" y="55" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">查詢文字</text>
  <text x="380" y="70" text-anchor="middle" font-size="10" fill="#64748b">User query input</text>
  <line x1="380" y1="76" x2="380" y2="100" stroke="#94a3b8" stroke-width="2" marker-end="url(#ir1)"/>
  <rect x="140" y="100" width="480" height="52" rx="10" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
  <text x="380" y="122" text-anchor="middle" font-size="12" font-weight="700" fill="#4c1d95">Pass 1：Regex Pattern Matching</text>
  <text x="380" y="140" text-anchor="middle" font-size="10" fill="#5b21b6">zero latency — 零 token — 毫秒級分類</text>
  <line x1="200" y1="152" x2="102" y2="180" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#ir1)"/>
  <line x1="300" y1="152" x2="265" y2="180" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#ir1)"/>
  <line x1="460" y1="152" x2="495" y2="180" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#ir1)"/>
  <line x1="560" y1="152" x2="657" y2="180" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#ir1)"/>
  <rect x="20" y="180" width="165" height="88" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="102" y="200" text-anchor="middle" font-size="12" font-weight="700" fill="#1e3a8a">location</text>
  <text x="102" y="215" text-anchor="middle" font-size="10" fill="#1d4ed8">在哪/路徑/哪個檔案</text>
  <text x="102" y="233" text-anchor="middle" font-size="11" font-weight="600" fill="#1e40af">→ TF-IDF</text>
  <text x="102" y="249" text-anchor="middle" font-size="10" fill="#1d4ed8">關鍵字精準匹配</text>
  <text x="102" y="263" text-anchor="middle" font-size="10" fill="#3b82f6">符號名搜尋優先</text>
  <rect x="197" y="180" width="136" height="88" rx="8" fill="#d1fae5" stroke="#059669" stroke-width="1.5"/>
  <text x="265" y="200" text-anchor="middle" font-size="12" font-weight="700" fill="#064e3b">concept</text>
  <text x="265" y="215" text-anchor="middle" font-size="10" fill="#065f46">是什麼/解釋/原理</text>
  <text x="265" y="233" text-anchor="middle" font-size="11" font-weight="600" fill="#047857">→ 向量相似度</text>
  <text x="265" y="249" text-anchor="middle" font-size="10" fill="#065f46">語意理解優先</text>
  <text x="265" y="263" text-anchor="middle" font-size="10" fill="#10b981">cosine similarity</text>
  <rect x="428" y="180" width="136" height="88" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="496" y="200" text-anchor="middle" font-size="12" font-weight="700" fill="#78350f">relation</text>
  <text x="496" y="215" text-anchor="middle" font-size="10" fill="#92400e">關係/影響/連結</text>
  <text x="496" y="233" text-anchor="middle" font-size="11" font-weight="600" fill="#b45309">→ 圖遍歷+向量</text>
  <text x="496" y="249" text-anchor="middle" font-size="10" fill="#92400e">NetworkX 節點間</text>
  <text x="496" y="263" text-anchor="middle" font-size="10" fill="#d97706">雙節點關聯</text>
  <rect x="574" y="180" width="165" height="88" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="1.5"/>
  <text x="657" y="200" text-anchor="middle" font-size="12" font-weight="700" fill="#7f1d1d">failure</text>
  <text x="657" y="215" text-anchor="middle" font-size="10" fill="#991b1b">錯誤/修復/Exception</text>
  <text x="657" y="233" text-anchor="middle" font-size="11" font-weight="600" fill="#b91c1c">→ 向量+boost</text>
  <text x="657" y="249" text-anchor="middle" font-size="10" fill="#991b1b">失敗模式頁面優先</text>
  <text x="657" y="263" text-anchor="middle" font-size="10" fill="#ef4444">語意 + 主題加權</text>
  <line x1="380" y1="152" x2="380" y2="286" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="5,4" marker-end="url(#ir2)"/>
  <rect x="185" y="286" width="390" height="26" rx="8" fill="#fdf4ff" stroke="#a855f7" stroke-width="1.5"/>
  <text x="380" y="303" text-anchor="middle" font-size="10" font-weight="600" fill="#7e22ce">Pass 2（按需）：LLM 擴展 — 檢索最高分 &lt; 0.5 或多概念查詢時觸發</text>
</svg>
</figure>

**Pass 2：LLM 查詢擴展（按需觸發，避免浪費 token）**

只在兩種情況觸發（`needs_expansion`）：
1. 初步檢索的最高分 < 0.5（檢索沒把握，查到的東西都不太相關——注意這是「檢索結果分數」，不是 Pass 1 的意圖信心分）
2. 查詢含多概念結構（「A 跟 B 的差異」「X vs Y」）

LLM 接收原始查詢 + Pass 1 初步命中概念，生成 2-3 個補充查詢角度。這樣單一明確的查詢幾乎是零 latency，複雜查詢才花 LLM 成本。

---

## 8. 為什麼 domain-agnostic：Provider 與 Adapter 抽象

MindGraph 能從交易系統抽離出來，靠的是兩層抽象。

### 8.1 Provider 抽象：不綁任何 LLM 供應商

`LLMProvider` 和 `EmbeddingProvider` 是兩個 ABC，rewrite 與 embedding 全走介面，換供應商只改 `mindgraph.yml`：

| LLM `provider` | 支援模型 |
|----------------|----------|
| `anthropic` | claude-sonnet-4-6 / claude-haiku-4-5 / claude-opus-4-8 |
| `openai` | gpt-4o-mini / gpt-4o |
| `gemini` | gemini-2.0-flash / gemini-pro |

| Embedding `provider` | 模型 | 維度 |
|----------------------|------|------|
| `gemini` | gemini-embedding-001 | 768 |
| `openai` | text-embedding-3-small | 1536 |
| `openai` | text-embedding-3-large | 3072 |

兩張表各自獨立、不是逐列對應——LLM 與 embedding 可以分開選，比如用 Anthropic 做 rewrite、用 Gemini 做 embedding，互不干涉。

### 8.2 Adapter 抽象：不綁任何資料源

`DataSourceAdapter` 把「資料從哪來」跟 ingest pipeline 解耦。內建 `FileSystemAdapter`，要接 Notion / Confluence / DB 只要實作 `fetch()` 回傳 `RawDocument[]`：

```python
from mindgraph.adapters.base import DataSourceAdapter, RawDocument

class NotionAdapter(DataSourceAdapter):
    def fetch(self) -> list[RawDocument]:
        # 從 Notion API 拉頁面
        return [RawDocument(content=..., filename=..., metadata={...})]

    def get_target_dir(self) -> str:
        return "raw/notion"
```

```yaml
adapters:
  - type: custom
    module: myproject.adapters.NotionAdapter
```

這兩層抽象就是「把交易系統的知識管線變成通用引擎」的全部祕密——核心邏輯（raw→wiki、圖、向量、意圖路由）對領域與供應商一無所知。

---

## 9. 案例研究：我的交易系統

MindGraph 不是憑空設計的，它是從一個真實、高速迭代的交易系統裡長出來的——那也是它被磨到最硬的地方。

### 9.1 知識來自哪裡

交易系統每天產生大量 raw：開發踩坑日誌（devdiary）、模組設計規格（specs）、市場分析、Munger 決策系統的因果節點、各策略的情境劇本。這些全進 `raw/`，由 ingest 編譯成今天的知識圖：

- **335** 個 wiki 頁面、**1,224** 條邊（其中 901 條 `EXTRACTED`、323 條 `INFERRED`）、**18** 個自動偵測社群
- 涵蓋系統架構、策略、綜合分析、失敗模式（75 頁）等分類

### 9.2 把覆蓋率從 45% 推到 85.5%

我清查交易後端：哪些公用方法能連結到對應的 wiki 概念？這裡用的是比第 6.4 節更嚴格的**公用方法口徑**（分母是 backend/ 公用方法，排除私有與 tests/，約 1,619→1,660 個——過程中因 VM 新增 commit 而微幅變動，所以整條階梯是跨「移動中分母」的近似值）。起點是 **45%**。推升的路徑很反直覺——關鍵不是寫更多頁，而是**寫對 docstring**：

| 階段 | 動作 | 覆蓋率 |
|------|------|--------|
| 基線 | name-only 連結 | 45.2% |
| wiki sync 修正 | 先 `/api/sync` 重建 graph | 53.4% |
| 補 19 個模組 wiki 規格 | 學習 / 下單 / 轉倉 / VIX / Greeks 等 | 54.4% |
| 補 repository layer wiki | 列出所有 Repository class | 56.8% |
| Round 1 docstring（占位符） | `[Munger 決策系統] get_active` | 57.5%（+0.7%，幾乎無效） |
| Round 2 docstring（完整業務說明） | 63 檔案 | 66.7% |
| Round 3a docstring（深化） | 35 檔案 | 77.8% |
| Round 3b docstring（深化） | 39 檔案 | **85.5%** |

最大的教訓是 **docstring 的語意密度決定 embedding 效果**。占位符格式（只寫模組名 + 方法名）只把覆蓋率從 56.8% 推到 57.5%（+0.7%，幾乎無效）——因為 embedding 需要一條「語意鏈」：從方法名（技術術語）橋接到 wiki 概念（業務術語）。寫上完整業務上下文後，137 個檔案的 embedding 連結從 1,878 暴增到 **4,101**（+2,223）。85% 是當前的合理上限，剩下 15% 是泛型基底類別與框架入口點。

### 9.3 production 擴充一：時間感知排序（λ 衰減）

> 以下兩節是交易部署在開源引擎之上加的 production 層；MindGraph MVP 尚未內建，但它們是 roadmap 的方向。

Cosine 相似度只有一個維度：語意。它不知道時間。當兩個頁面討論相同概念——一個是八個月前的舊分析，一個是上週的最新判斷——cosine 會給接近的分數，但你顯然想要新的。在知識快速迭代的領域，舊洞見不只是「舊」，有時是「已被推翻」。

解法是在 SQL 排序階段乘上指數衰減：

```
score = similarity × exp(-λ × age_in_days)
```

| λ 值 | 30 天後保留 | 180 天後保留 | 適合場景 |
|------|-----------|------------|---------|
| 0.001 | 97% | 83% | 學術論文、穩定技術概念 |
| 0.003 | 91% | 58% | 業務知識、市場分析（我的預設值） |
| 0.005 | 86% | 41% | 快速迭代的產品決策 |

衰減發生在排序層，不動向量本身——語意空間保持乾淨。再用一張 `evergreen_concepts` lookup table 保護永恆知識（技術指標定義、數學公式、設計原則）：在清單內就跳過衰減。λ 還會由週六的 cron 根據命中率自動校準，從靜態配置變成自適應參數。

### 9.4 production 擴充二：主動知識注入（WikiContextEnricher）

前面都是「被動」的：Agent 問 → 系統答。但有一類場景需要主動：**Agent 在執行分析時，根本不知道知識庫有哪些相關背景，也就問不出自己不知道存在的問題。**

以 Munger 市場分析為例，系統在 pipeline 最後**主動**根據當前情境（經濟事件、Regime A/B/C）查知識庫，把 top 結果注入 LLM context：

```
【交易知識庫背景】
▸ CPI-高通膨歷史反應: CPI 高於預期時 ZB 通常在公布後 2 小時內下跌...
▸ Regime A 資金輪動策略: 重大數據公布前 30 分鐘縮倉，公布後觀察方向...
```

它有一條鐵律：**知識服務掛掉時，分析不能停。** 5 秒超時、任何失敗靜默返回空字串，每個 context builder 都是獨立 try/except。最壞情況是 LLM 少看一段背景，不是分析失敗——這讓主動注入能以零風險加入生產系統。

### 9.5 完整六步閉環

把所有東西串起來，交易部署的日常運作是一個六步閉環：

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 175" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="175" fill="#f8fafc" rx="16"/>
  <text x="380" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#1e293b">交易部署：完整六步自動化閉環</text>
  <defs>
    <marker id="fa" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#94a3b8"/></marker>
  </defs>
  <rect x="12" y="38" width="108" height="120" rx="9" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="66" y="60" text-anchor="middle" font-size="18" fill="#92400e">①</text>
  <text x="66" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#78350f">原始資料</text>
  <text x="66" y="96" text-anchor="middle" font-size="9" fill="#92400e">devdiary/</text>
  <text x="66" y="110" text-anchor="middle" font-size="9" fill="#92400e">specs/</text>
  <text x="66" y="148" text-anchor="middle" font-size="9" fill="#d97706">持續</text>
  <line x1="120" y1="98" x2="132" y2="98" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#fa)"/>
  <rect x="133" y="38" width="108" height="120" rx="9" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="187" y="60" text-anchor="middle" font-size="18" fill="#4c1d95">②</text>
  <text x="187" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#4c1d95">LLM Ingest</text>
  <text x="187" y="96" text-anchor="middle" font-size="9" fill="#5b21b6">raw/ 掃描</text>
  <text x="187" y="110" text-anchor="middle" font-size="9" fill="#5b21b6">wiki/ 更新</text>
  <text x="187" y="148" text-anchor="middle" font-size="9" fill="#7c3aed">定期</text>
  <line x1="241" y1="98" x2="253" y2="98" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#fa)"/>
  <rect x="254" y="38" width="108" height="120" rx="9" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="308" y="60" text-anchor="middle" font-size="18" fill="#1e3a8a">③</text>
  <text x="308" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#1e3a8a">圖譜同步</text>
  <text x="308" y="96" text-anchor="middle" font-size="9" fill="#1d4ed8">graph 重建</text>
  <text x="308" y="110" text-anchor="middle" font-size="9" fill="#1d4ed8">embedding refresh</text>
  <text x="308" y="148" text-anchor="middle" font-size="9" fill="#2563eb">wiki 更新觸發</text>
  <line x1="362" y1="98" x2="374" y2="98" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#fa)"/>
  <rect x="375" y="38" width="108" height="120" rx="9" fill="#d1fae5" stroke="#059669" stroke-width="1.5"/>
  <text x="429" y="60" text-anchor="middle" font-size="18" fill="#064e3b">④</text>
  <text x="429" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#064e3b">Code Relink</text>
  <text x="429" y="96" text-anchor="middle" font-size="9" fill="#065f46">symbols 掃描</text>
  <text x="429" y="110" text-anchor="middle" font-size="9" fill="#065f46">name+embedding</text>
  <text x="429" y="148" text-anchor="middle" font-size="9" fill="#059669">每週一次</text>
  <line x1="483" y1="98" x2="495" y2="98" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#fa)"/>
  <rect x="496" y="38" width="108" height="120" rx="9" fill="#ffedd5" stroke="#ea580c" stroke-width="2"/>
  <text x="550" y="60" text-anchor="middle" font-size="18" fill="#7c2d12">⑤</text>
  <text x="550" y="78" text-anchor="middle" font-size="11" font-weight="700" fill="#7c2d12">週品質評估</text>
  <text x="550" y="94" text-anchor="middle" font-size="9" fill="#9a3412">命中率測試</text>
  <text x="550" y="108" text-anchor="middle" font-size="9" fill="#9a3412">λ 自動校準</text>
  <text x="550" y="122" text-anchor="middle" font-size="9" fill="#9a3412">memory 掃重複</text>
  <text x="550" y="148" text-anchor="middle" font-size="9" fill="#ea580c">每週六 09:00</text>
  <line x1="604" y1="98" x2="616" y2="98" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#fa)"/>
  <rect x="617" y="38" width="131" height="120" rx="9" fill="#f3e8ff" stroke="#9333ea" stroke-width="2"/>
  <text x="682" y="60" text-anchor="middle" font-size="18" fill="#581c87">⑥</text>
  <text x="682" y="78" text-anchor="middle" font-size="11" font-weight="700" fill="#581c87">查詢+主動注入</text>
  <text x="682" y="94" text-anchor="middle" font-size="9" fill="#6b21a8">意圖感知搜尋</text>
  <text x="682" y="108" text-anchor="middle" font-size="9" fill="#6b21a8">wiki context 推送</text>
  <text x="682" y="122" text-anchor="middle" font-size="9" fill="#6b21a8">LLM 自動增強</text>
  <text x="682" y="148" text-anchor="middle" font-size="9" fill="#9333ea">即時＋每次分析</text>
</svg>
</figure>

---

## 10. 四個設計原則

**原則一：不給 Agent 答案，給它地圖**

系統提供可查詢的結構，Agent 在工作時自己決定要查什麼。這比把所有知識塞進 context 更省 token，也讓 Agent 能根據任務動態組合知識。

**原則二：Raw 不可變，Wiki 可重寫**

原始資料的完整性比整潔重要。一條今天看起來「不重要」的紀錄，六個月後可能是解釋一個奇怪 bug 的關鍵線索。Wiki 可以隨理解進化，但 raw 一旦寫下就不能改。

**原則三：向量 + 圖 + 關鍵字 + 意圖，多軸檢索**

- 關鍵字（TF-IDF）：解決「精確詞在哪」
- 語意（cosine）：解決「什麼相關」
- 圖遍歷（NetworkX）：解決「關聯什麼」
- 意圖路由：解決「這個查詢用哪種策略最準」

四軸互補，任何一軸單獨都不夠。（時間衰減是 production 部署再加的第五軸。）

**原則四：降級不中斷，主動勝被動**

向量庫掛了就退化成關鍵字，知識服務掛了就靜默略過——任何單點故障都不能拖垮主流程。而最好的知識系統不是等 Agent 來問，是在它工作時主動遞送背景。

---

## 11. Roadmap 與開源

MindGraph 目前是 **v0.2.0**（MIT 授權，62 個 pytest）：

- **Phase 1（✅ v0.1.0）**：CLI（ingest / embed / stats / search / check / coverage）、Provider 抽象、FileSystemAdapter + custom adapter 協定、WikiGraphEngine、EmbeddingStore（pgvector）、idempotent ingest + 原子 state
- **Phase 2（✅ v0.2.0）**：REST API（`mindgraph serve`，10 端點，預設綁 127.0.0.1）、MCP server（`mindgraph mcp`，8 tools，給 Claude Code 當外部記憶）、Gemini 遷到 `google.genai` 新 SDK、`check` 擴充診斷（孤立頁／斷 wikilink／缺 frontmatter）
- **Phase 3（✅ v0.2.0）**：`two_stage_hybrid` + IntentRouter 接上 `search --hybrid` 與 REST／MCP `smart_search`、mtime 增量建圖、概念演化時間軸（`mindgraph timeline` + `/api/timeline`）。交易部署的時間衰減與主動注入仍是想回灌進開源核心的方向

部署用 Docker（`mindgraph` 引擎 + `pgvector/pgvector:pg16`）一鍵起。REST API 無認證、預設只綁 loopback，要對外得自行加 auth proxy。

---

## 12. 結語

這套系統真正的價值不在於搜尋速度，而在於：

**每次 bug 修復、每次架構決策、每次踩坑——都成為下一次 Agent 工作的先驗知識。**

MindGraph 把它收斂成三個遞進層次：

1. **知識建構**：Adapter → raw → LLM ingest → wiki，把日常活動轉為可搜尋的結構化知識
2. **智慧檢索**：圖 + 向量 + 關鍵字 + 意圖路由，確保查詢拿到最相關的知識
3. **主動增強**（production）：在分析任務執行時主動推送背景，Agent 不需要問就能獲得情境支援

知識庫隨系統一起生長，Agent 的協助品質也隨之提升。這才是 AgenticOps 應該有的樣子：**讓 AI 工具的使用本身成為知識積累的過程，讓知識積累的過程反過來提升 AI 工具的品質。**

---

*MindGraph 技術棧：PostgreSQL + pgvector、NetworkX、Python。LLM / Embedding 走可替換的 Provider 抽象（Anthropic / OpenAI / Gemini）。原始碼（MIT）：[github.com/Zekkar/mindgraph-engine](https://github.com/Zekkar/mindgraph-engine)。*
