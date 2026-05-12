---
title: "基於基礎架構的 AgentEngineer：可觀測性如何讓 Agent 自我修復"
date: 2026-05-12
categories:
  - 技術
tags:
  - AI
  - AgentEngineer
  - 可觀測性
  - AgenticOps
  - Claude Code
  - Infrastructure
  - 自我修復
  - Closed-loop
excerpt: "當 AI 開始寫 code、跑部署、發告警，誰來盯 production？把基礎架構先鋪好，Agent 才有眼睛、有手、有記憶。這篇文章談如何用四層可觀測性金字塔，搭配 Telegram 與 GitHub CI 的層層把關，做出開發/驗證/修復/學習的完整閉環。"
toc: true
toc_sticky: true
---

## 1. 問題：AI 寫 code 容易，AI 看 production 很難

過去兩年，「讓 AI 幫忙寫程式」這件事從 demo 變成日常。Cursor、Claude Code、Copilot 都能在 30 秒內把一個 React 元件、一支 Python 服務、一條 SQL migration 寫得像樣。但只要踏出「local 編譯通過」的舒適圈，故事就完全不同：

- API 在 staging 跑 30 秒後 OOM，沒人知道為什麼。
- 新功能 ship 出去三小時後，前端開始間歇性 500，但 Sentry 沒抓到。
- 一個 nightly migration 把某張表的 index drop 掉，隔天 dashboard 變慢三倍。

這些不是「程式寫錯」造成的問題，是**系統行為（system behavior）**的問題。它們的特徵很一致：在編譯時不會被 catch、在 unit test 也測不出來、要等到流量、時間、外部依賴、資料分佈這些變數一起作用，才會浮現。

所以單純把 AI 當「會寫 code 的下屬」沒用——你會得到一個寫得很快、但不知道自己寫出來的東西在 production 是不是還活著的下屬。要讓 AI 變成「能負責的工程師」，得先把它的眼睛、耳朵、手裝上去。這套裝備就是**基礎架構**。

---

## 2. 主張：基礎架構優先，服務建立其上

傳統 SRE 文化說「先建服務、再補可觀測性」，這個順序在 AI 時代要倒過來：

> **先把基礎架構（觀測 + 告警 + 通知 + 治理）鋪好，再讓服務一個個跑上去。**
>
> 因為 Agent 不能「憑感覺」debug——它只能看到你給它看的東西。沒 trace 就推不出因果，沒 log 就還原不了現場，沒 metric 就沒辦法判斷異常基準線。**基礎架構決定了 Agent 智力的上限。**

實務上這意味著：當你決定要開一個新交易服務、新策略引擎、新前端的時候，第一個問題不是「用什麼 framework」，而是**「這個服務的 trace、log、metric、health endpoint 從第一行 code 開始就要存在」**。它必須跟基礎架構同時誕生，不是事後補。

---

## 3. 系統架構：可觀測性四層金字塔

我目前運行的這套基礎架構可以拆成四層，由下往上層層支撐：

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 460" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="460" fill="#f8fafc" rx="16"/>
  <text x="380" y="36" text-anchor="middle" font-size="16" font-weight="700" fill="#1e293b">可觀測性金字塔 (Observability Pyramid)</text>

  <!-- L4 Governance -->
  <rect x="220" y="68" width="320" height="74" rx="12" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
  <text x="380" y="98" text-anchor="middle" font-size="14" font-weight="700" fill="#1d4ed8">L4 · 治理層 (Governance)</text>
  <text x="380" y="120" text-anchor="middle" font-size="12" fill="#3b82f6">GitHub CI · Wiki 知識庫 · Agent 閉環</text>

  <!-- L3 Notification -->
  <rect x="160" y="160" width="440" height="74" rx="12" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="380" y="190" text-anchor="middle" font-size="14" font-weight="700" fill="#6d28d9">L3 · 通訊層 (Notification)</text>
  <text x="380" y="212" text-anchor="middle" font-size="12" fill="#8b5cf6">Webhook → 統一通知服務 → Telegram bot (雙向)</text>

  <!-- L2 Service -->
  <rect x="100" y="252" width="560" height="74" rx="12" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="380" y="282" text-anchor="middle" font-size="14" font-weight="700" fill="#065f46">L2 · 服務層 (Services)</text>
  <text x="380" y="304" text-anchor="middle" font-size="12" fill="#10b981">每支服務 emit OTel trace + structured log + /metrics + /healthz</text>

  <!-- L1 Foundation -->
  <rect x="60" y="344" width="640" height="74" rx="12" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="380" y="374" text-anchor="middle" font-size="14" font-weight="700" fill="#92400e">L1 · 觀測底層 (Foundation)</text>
  <text x="380" y="396" text-anchor="middle" font-size="12" fill="#f59e0b">Prometheus (metrics) · Loki (logs) · Tempo (traces) · Alertmanager (rules)</text>

  <!-- Arrows up -->
  <defs>
    <marker id="up-arrow" markerWidth="8" markerHeight="6" refX="4" refY="0" orient="auto"><polygon points="0 6,4 0,8 6" fill="#64748b"/></marker>
  </defs>
  <line x1="380" y1="344" x2="380" y2="328" stroke="#64748b" stroke-width="2" marker-end="url(#up-arrow)"/>
  <line x1="380" y1="252" x2="380" y2="236" stroke="#64748b" stroke-width="2" marker-end="url(#up-arrow)"/>
  <line x1="380" y1="160" x2="380" y2="144" stroke="#64748b" stroke-width="2" marker-end="url(#up-arrow)"/>

  <!-- Side labels -->
  <text x="36" y="382" text-anchor="middle" font-size="11" fill="#64748b">原料</text>
  <text x="36" y="290" text-anchor="middle" font-size="11" fill="#64748b">產生</text>
  <text x="36" y="198" text-anchor="middle" font-size="11" fill="#64748b">傳遞</text>
  <text x="36" y="106" text-anchor="middle" font-size="11" fill="#64748b">決策</text>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">圖 1 · 四層金字塔：底層產生原料、上層做決策；缺一層 Agent 就瞎一隻眼。</figcaption>
</figure>

### L1 · 觀測底層

整套觀測 stack 跑在**單一 LAN 主機**上，用 docker-compose 編排：Prometheus 收 metrics、Loki 收 log（透過 Promtail 從 Docker socket 讀）、Tempo 收 OTel trace、Alertmanager 跑告警規則。Grafana 是統一 UI，三個 datasource 之間靠 `trace_id` 串起來——點 metric 異常的點，能跳到對應時間區間的 log；log 裡的 trace_id 能跳到完整 trace。

### L2 · 服務層

所有業務服務（trading API、市場資料服務、策略引擎、前端 BFF……）都遵守同一份契約：

- 啟動時用 OTel SDK 註冊自己，所有外部呼叫自動產生 span。
- 用 structlog 印 JSON-format log，欄位包含 `level / logger / event / trace_id / timestamp`。
- 暴露 `/metrics` 給 Prometheus scrape、`/healthz` 給 Docker healthcheck + 上游監控。

這份契約寫進專案模板，新服務從第一個 commit 開始就符合，不是靠人類記得補。

### L3 · 通訊層

Alertmanager 不直接打 Telegram API。所有告警先 webhook 進一個自寫的「通知服務」，做格式正規化、嚴重度分流、分組合併、抑制 rule，再透過 bot 推到對應的 Telegram 頻道。為什麼多這一跳？因為通知服務同時是 Agent 的**反向 entry point**——Telegram 訊息回來時，bot 把使用者意圖打包成 event，餵給 Agent runtime。雙向。

### L4 · 治理層

最上面是 GitHub CI 跟 wiki 知識庫。CI 是靜態守門員（lint、type-check、test、smoke build）；wiki 是 Agent 的長期記憶，記錄過往決策、失敗模式、設計規格。Agent 在開新任務前會做「Step 0 假設審計」：把這次要動的事拆成 3~7 個假設，每個假設都去 wiki 搜尋是否曾經有人踩過、有沒有設計衝突——有衝突就先回報，不衝突才動手。

---

## 4. Dev → Verify → Fix → Learn 閉環

有了四層基礎架構，AgentEngineer 的工作就不再是「寫完交付」的線性流程，而是**四階段閉環**：

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;width:100%;font-family:'Segoe UI','Microsoft JhengHei',sans-serif">
  <rect width="760" height="380" fill="#f8fafc" rx="16"/>
  <text x="380" y="32" text-anchor="middle" font-size="16" font-weight="700" fill="#1e293b">AgentEngineer 閉環</text>

  <defs>
    <marker id="ah2" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0,9 3.5,0 7" fill="#3b82f6"/></marker>
  </defs>

  <!-- ① Dev -->
  <rect x="80" y="70" width="200" height="110" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
  <text x="180" y="100" text-anchor="middle" font-size="14" font-weight="700" fill="#1d4ed8">① Dev</text>
  <text x="180" y="124" text-anchor="middle" font-size="12" fill="#3b82f6">Agent 讀規格、查 wiki</text>
  <text x="180" y="142" text-anchor="middle" font-size="12" fill="#3b82f6">Brainstorm → SBE → Plan</text>
  <text x="180" y="162" text-anchor="middle" font-size="11" fill="#64748b">收斂後才寫 code</text>

  <!-- ② Verify -->
  <rect x="480" y="70" width="200" height="110" rx="14" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="580" y="100" text-anchor="middle" font-size="14" font-weight="700" fill="#6d28d9">② Verify</text>
  <text x="580" y="124" text-anchor="middle" font-size="12" fill="#8b5cf6">GitHub CI · mypy · tests</text>
  <text x="580" y="142" text-anchor="middle" font-size="12" fill="#8b5cf6">Playwright E2E</text>
  <text x="580" y="162" text-anchor="middle" font-size="11" fill="#64748b">HTTP 200 ≠ 功能正確</text>

  <!-- ③ Fix -->
  <rect x="480" y="210" width="200" height="110" rx="14" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="580" y="240" text-anchor="middle" font-size="14" font-weight="700" fill="#b91c1c">③ Fix</text>
  <text x="580" y="264" text-anchor="middle" font-size="12" fill="#ef4444">Alertmanager → Telegram</text>
  <text x="580" y="282" text-anchor="middle" font-size="12" fill="#ef4444">trace + log + metric</text>
  <text x="580" y="302" text-anchor="middle" font-size="11" fill="#64748b">三方查根因 → 提修復</text>

  <!-- ④ Learn -->
  <rect x="80" y="210" width="200" height="110" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="180" y="240" text-anchor="middle" font-size="14" font-weight="700" fill="#92400e">④ Learn</text>
  <text x="180" y="264" text-anchor="middle" font-size="12" fill="#d97706">DevDiary [失敗模式]</text>
  <text x="180" y="282" text-anchor="middle" font-size="12" fill="#d97706">Ingest → Wiki</text>
  <text x="180" y="302" text-anchor="middle" font-size="11" fill="#64748b">下次 Step 0 自動命中</text>

  <!-- Clockwise arrows -->
  <line x1="280" y1="125" x2="480" y2="125" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah2)"/>
  <text x="380" y="115" text-anchor="middle" font-size="11" fill="#64748b">push to PR</text>

  <line x1="580" y1="180" x2="580" y2="210" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah2)"/>
  <text x="600" y="200" text-anchor="start" font-size="11" fill="#64748b">prod 出事</text>

  <line x1="480" y1="265" x2="280" y2="265" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah2)"/>
  <text x="380" y="255" text-anchor="middle" font-size="11" fill="#64748b">事件結束</text>

  <line x1="180" y1="210" x2="180" y2="180" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah2)"/>
  <text x="160" y="200" text-anchor="end" font-size="11" fill="#64748b">下次任務</text>

  <!-- center note -->
  <text x="380" y="200" text-anchor="middle" font-size="11" fill="#94a3b8">↑ Telegram = 觸發器</text>
  <text x="380" y="218" text-anchor="middle" font-size="11" fill="#94a3b8">↓ Wiki = 記憶體</text>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">圖 2 · 四階段閉環。每一輪都在累積知識，下一輪起跑線更高。</figcaption>
</figure>

### ① Dev — 寫之前先盤點假設

Agent 不直接動手寫 code。先列假設（這次改的功能依賴什麼？跟現有哪些模組會衝突？）、查 wiki 確認假設、發現衝突就先回報。確認 OK 才進 brainstorm → SBE（spec-by-example）→ plan → 寫 code。**「先收斂，再執行」**是 Agent 跟人類 vibe coding 的最大差別。

### ② Verify — 靜態 + 動態雙閘

GitHub CI 跑 mypy / pytest / ruff，把編譯期能 catch 的問題擋在 PR；本地或 staging 跑 Playwright E2E，把「服務健康但功能壞掉」的問題擋在部署前。**HTTP 200 不等於功能正確**——這是這套系統最核心的紀律之一，違反就會出事，沒有例外。

### ③ Fix — 告警觸發 Agent，不是觸發人

Production 告警先進 Telegram。Agent 看到告警類型自動分流：基礎設施類（OOM、容器重啟、CPU 過高）跑 infra-diagnose 五階段流程；應用邏輯類（業務 log error spike、特定 endpoint 5xx）跑 bug-fix 流程；先用 trace / log / metric 三方查根因，再提修復方案。人類只在「需要授權破壞性操作」時被叫醒。

### ④ Learn — 失敗變知識

事件結束後寫 DevDiary，特別在「踩到的坑」加上結構化標記 `[失敗模式]`。再透過 ingest pipeline 把 raw diary 編譯進 wiki 的「失敗模式」目錄。下次再有類似需求，Step 0 假設審計搜 wiki 會自動命中——同類型錯誤不會犯第二次。

---

## 5. 雙閘治理：GitHub CI 靜態 + Telegram 告警動態

傳統 CI 文化常常陷入「PR 過了就 ship」的幻覺。但 PR 通過只代表程式碼**能跑**，不代表它在 production 跑得好。所以這套系統把治理拆成兩道閘，缺一不可：

> **靜態閘 (GitHub CI)**：mypy 強制 type-check、ruff/mypy 抓 typo 與 mutation bug、pytest 跑單元 + integration 測試、Docker build 確認 image 能起來。PR 不過、不准 merge。

> **動態閘 (Runtime Alerts)**：Prometheus 規則監看「container restart too often / OOMKilled / latency P95 spike / error rate spike」；Loki ruler 監看 application log 的「ERROR rate burst / CRITICAL log appearance」。任一告警觸發都會在 1~5 分鐘內進 Telegram。

關鍵在於：**兩道閘看的東西完全不同**。靜態閘看程式碼結構，動態閘看 system behavior。靜態閘 100% 通過、動態閘 100% 失敗，這種事每週都發生——所以兩道閘都得有人盯。Agent 就是那個盯動態閘的不睡覺工程師。

---

## 6. 實戰案例：一次 Loki 告警誤報的閉環

來個今天剛跑完的真實案例。把它拆解成四階段你就能看到整套機制怎麼運作。

### 觸發：Telegram 收到 CRITICAL 告警

```
🚨 告警
策略: Alertmanager-trading-api
類型: critical
訊息: ✅ RESOLVED AppLogCriticalBurst
摘要: trading-api 出現 CRITICAL log
觸發時間: 08:41:40 (+08:00)
狀態: resolved
```

告警已自動 resolved，但 CRITICAL 級別不能放——「無容忍閾值」是這條規則的設計初衷。Agent 立刻進入 Fix 階段。

### 診斷：用 Loki 還原時光機

本機 `docker logs --since=30m` 沒東西——因為容器已經 recreate，舊容器的 logs 隨之消失。但 Loki 還在。用 LogQL 查歷史窗口：

```logql
{container="trading-api"} |~ "\"level\":\\s*\"CRITICAL\""
  [start=08:35, end=08:55]
```

抓到三筆 CRITICAL log，分屬三個不同的 container_id：

- 08:40:28 — `收到系統信號 SIGTERM (15)，進程即將關閉`
- 08:40:53 — 同上，新容器又被 SIGTERM
- 08:46:02 — 第三次 SIGTERM

每筆都附帶 uvicorn signal handler 印出的 stack trace。容器最新狀態 `RestartCount=0, OOMKilled=false, ExitCode=0`——全部都是 _graceful shutdown_，不是 crash。

### 對照 git log：根因現形

```
e4f75eb 08:39:20  refactor+ci: mypy CI gate
2c13385 08:45:10  fix: mypy CI 攔下的 2 個潛在 bug
```

兩個 commit 後各觸發一次 `docker compose up -d --build`，每次 build 又重試一次——三次 SIGTERM 對應的就是三次部署 cycle。沒有 production 事件，是**誤報**。

### 修法：改 source-of-truth、不改 symptom

誤報的根因有兩層：

1. **表層**：Alertmanager rule 把「graceful SIGTERM」當成 CRITICAL log 誤觸發。
2. **底層**：app.main 的 signal handler 把預期的 SIGTERM 印成 CRITICAL（違反 log-level 紀律：CRITICAL 應該留給「影響運行的錯誤」）。

當下選最小可逆修改：在 Loki ruler 的 LogQL 加 `!~ "SIGTERM|信號來源堆疊"` 排除 graceful shutdown 噪音。Loki rule 改完、`docker restart loki`，ruler 重新 load，從 ruler log 確認新 query 已生效。

> **關鍵紀律**：選方案前要先讓使用者確認。Agent 有兩個方向（降 log level vs 改 alert rule），各有 trade-off，列出來給人類選——這是「方向類」決策，人類比 Agent 快。

### 學習：發現一個更大的問題

修完誤報後，Agent 發現 Loki ruler 規則檔只活在 Docker named volume 內，`~/infrastructure/` 根本沒有對應源檔。這代表：

- 這條規則沒被 git 管理，沒人知道它怎麼來的。
- 下次有人 `docker volume rm`，規則就消失。
- 沒 commit history，無法 audit「誰在什麼時候改了它」。

這是**「volume drift」反模式**——production config 跟 IaC source-of-truth 分裂。Agent 在 Telegram 提醒人類，並把規則檔鏡像回 `~/infrastructure/loki/rules/`。後續整個 `~/infrastructure/` 補 `git init`，掃 secrets（hard-coded 密碼移到 env var）、寫 .gitignore、commit baseline。從一個告警誤報，推到一個 infra 治理的 baseline 改善——這就是 Learn 階段該做的事。

---

## 7. 反模式：三個讓 Agent 失效的盲點

### 盲點 1：服務健康 ≠ 功能正確

`curl /healthz` 回 200，只證明伺服器在線——不證明 UI 顯示對、API 資料流對、按鈕按下去會發生事。**唯一能確認的方式是 E2E 跑過 golden path**。任何以「時間緊迫」「改動很小」「只是 UI」為由跳過 E2E 的，都是在製造未被發現的 bug。Agent 在這條紀律上比人類更嚴格——人類有 ego，Agent 沒有，叫它跑 Playwright 它就跑。

### 盲點 2：靜默自動恢復 &gt; 可觀測故障

很多人喜歡寫 `try / except: retry`、加 auto-restart，覺得「能自己好就好」。錯。**可觀測的故障永遠優於靜默的自動恢復**——前者讓你知道系統不健康、能去修根因；後者讓問題累積到某個閾值才爆炸，那時你連 trace 都拿不回來。Heartbeat + diagnostics 比 service auto-restart 更值得投資。

### 盲點 3：Volume drift（config 不在 IaC）

剛剛那個 Loki ruler 案例就是。任何 production config 只要不在 git 倉裡、不在 docker-compose bind mount 裡，它就遲早會 drift。基礎設施的 `~/infrastructure/` 必須是 source of truth，所有變更走 commit，禁止 sudo 直接編輯 volume 內檔案。這條紀律一鬆，整套基礎架構就退化成「上次誰改的我也忘了」。

---

## 8. 結語：人類的角色是「方向 + 授權」

當基礎架構鋪好、閉環跑起來之後，人類在這套系統裡剩兩件事可做：

1. **定方向**：要做什麼策略、要解什麼問題、產品優先級。這是 Agent 從 wiki 學不到的，因為它本來就不在 wiki 裡。
2. **授權破壞性操作**：DROP TABLE、push --force、刪除 volume——這些不可逆的事，Agent 可以準備、可以建議，但動手前永遠要問。

剩下的 90% 工作量——寫 code、跑測試、查 log、改 rule、部署、寫 diary、更新 wiki——都是 Agent 該做的。它不是取代工程師，是**把工程師從「執行者」升級成「指揮者」**。而能讓這個升級發生的前提，永遠是：

> **先有基礎架構，再有 Agent。**
>
> 沒有可觀測性的 Agent 是瞎的，沒有告警的 Agent 是聾的，沒有 wiki 的 Agent 是健忘的。把這三件事做好，Agent 才配叫 Engineer。

---

_本文為 AgentEngineer 系列首篇。後續會拆開講：(a) OTel trace 串接 LLM 推理過程，(b) failure-mode wiki 的設計與 ingest pipeline，(c) Telegram bot 作為 Agent runtime entry 的安全模型。_
