---
title: "Munger 市場情報系統：資金輪動分析與自我學習閉環"
date: 2026-05-05
categories:
  - 技術
tags:
  - 量化交易
  - AI
  - 市場分析
  - 自我學習
  - LLM
excerpt: "市場是一個大水缸，資金在各資產間流動，不會憑空消失。Munger 系統透過 LLM 多引擎分析、自動知識閉環和每日輪動合成報告，幫助追蹤資金的流向——以及累積中的尾端風險。"
toc: true
toc_sticky: true
---

市場是一個大水缸。

資金從某個資產流出，就必然流向另一個資產。這個看似簡單的觀察，是 Munger 系統設計的核心假設。

大多數市場分析工具問的是「這個資產會漲還是跌」。Munger 問的是另一個問題：

> **資金正在從哪裡出來？往哪裡去？水缸裡是否正在積累足以引發「洩洪」的尾端風險？**

這兩個問題框架的差距，決定了分析工具是否能在重大市場轉折前給出有意義的預警。

---

## 系統架構：三層設計

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg" style="max-width:700px;width:100%;font-family:'Segoe UI',Arial,sans-serif">
  <defs>
    <marker id="ma" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#64748b"/></marker>
  </defs>
  <rect width="700" height="380" fill="#f8fafc" rx="16"/>
  <text x="350" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">Munger 系統三層架構</text>
  <!-- Tank concept -->
  <rect x="30" y="60" width="200" height="280" rx="12" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="130" y="90" text-anchor="middle" font-size="14" font-weight="700" fill="#1d4ed8">市場水缸</text>
  <text x="130" y="108" text-anchor="middle" font-size="11" fill="#6b7280">8 資產的相對強弱</text>
  <!-- Asset bars inside tank -->
  <rect x="48" y="130" width="22" height="80" rx="3" fill="#ef4444" opacity=".7"/><text x="59" y="222" text-anchor="middle" font-size="9" fill="#64748b">ZB</text>
  <rect x="76" y="150" width="22" height="60" rx="3" fill="#f97316" opacity=".7"/><text x="87" y="222" text-anchor="middle" font-size="9" fill="#64748b">ZN</text>
  <rect x="104" y="120" width="22" height="90" rx="3" fill="#3b82f6" opacity=".7"/><text x="115" y="222" text-anchor="middle" font-size="9" fill="#64748b">ES</text>
  <rect x="132" y="140" width="22" height="70" rx="3" fill="#8b5cf6" opacity=".7"/><text x="143" y="222" text-anchor="middle" font-size="9" fill="#64748b">NQ</text>
  <rect x="160" y="160" width="22" height="50" rx="3" fill="#ec4899" opacity=".7"/><text x="171" y="222" text-anchor="middle" font-size="9" fill="#64748b">VIX</text>
  <rect x="48" y="240" width="22" height="60" rx="3" fill="#f59e0b" opacity=".7"/><text x="59" y="312" text-anchor="middle" font-size="9" fill="#64748b">DX</text>
  <rect x="76" y="250" width="22" height="50" rx="3" fill="#10b981" opacity=".7"/><text x="87" y="312" text-anchor="middle" font-size="9" fill="#64748b">GC</text>
  <rect x="104" y="230" width="22" height="70" rx="3" fill="#06b6d4" opacity=".7"/><text x="115" y="312" text-anchor="middle" font-size="9" fill="#64748b">CL</text>
  <!-- Tail risk meter -->
  <rect x="155" y="245" width="55" height="80" rx="6" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="182" y="262" text-anchor="middle" font-size="9" font-weight="700" fill="#b91c1c">尾端</text>
  <text x="182" y="274" text-anchor="middle" font-size="9" font-weight="700" fill="#b91c1c">風險</text>
  <rect x="163" y="280" width="39" height="8" rx="2" fill="#ef4444" opacity=".6"/>
  <rect x="163" y="292" width="28" height="8" rx="2" fill="#f97316" opacity=".6"/>
  <rect x="163" y="304" width="15" height="8" rx="2" fill="#10b981" opacity=".6"/>
  <text x="182" y="322" text-anchor="middle" font-size="8" fill="#b91c1c">HIGH</text>
  <!-- Arrows between layers -->
  <line x1="230" y1="190" x2="278" y2="190" stroke="#64748b" stroke-width="1.5" marker-end="url(#ma)"/>
  <!-- Event-driven layer -->
  <rect x="278" y="60" width="200" height="130" rx="12" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="378" y="90" text-anchor="middle" font-size="14" font-weight="700" fill="#6d28d9">事件驅動層</text>
  <text x="378" y="108" text-anchor="middle" font-size="11" fill="#6b7280">新聞 → 評分 → LLM 分析</text>
  <text x="378" y="126" text-anchor="middle" font-size="11" fill="#8b5cf6">relevance ≥ 60 → 自動觸發</text>
  <text x="378" y="144" text-anchor="middle" font-size="10" fill="#6b7280">平行共識 / 攻守辯證</text>
  <text x="378" y="160" text-anchor="middle" font-size="10" fill="#6b7280">8 資產 × 3 時間層影響評估</text>
  <text x="378" y="177" text-anchor="middle" font-size="10" fill="#6b7280">第二層思考 · 尾端風險偵測</text>
  <!-- Time-driven layer -->
  <rect x="278" y="210" width="200" height="130" rx="12" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="378" y="240" text-anchor="middle" font-size="14" font-weight="700" fill="#92400e">時間驅動層</text>
  <text x="378" y="258" text-anchor="middle" font-size="11" fill="#6b7280">每日 06:00–07:30 排程</text>
  <text x="378" y="276" text-anchor="middle" font-size="11" fill="#f59e0b">07:05 → 雙訊息推送 Telegram</text>
  <text x="378" y="294" text-anchor="middle" font-size="10" fill="#6b7280">指標統計 + LLM 輪動合成</text>
  <text x="378" y="310" text-anchor="middle" font-size="10" fill="#6b7280">週一：週回顧 + 知識提取</text>
  <text x="378" y="326" text-anchor="middle" font-size="10" fill="#6b7280">自動權重調整（14天準確率）</text>
  <!-- Arrows to self-learning -->
  <line x1="478" y1="125" x2="522" y2="155" stroke="#64748b" stroke-width="1.5" marker-end="url(#ma)"/>
  <line x1="478" y1="275" x2="522" y2="245" stroke="#64748b" stroke-width="1.5" marker-end="url(#ma)"/>
  <!-- Self-learning layer -->
  <rect x="522" y="120" width="160" height="160" rx="12" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="602" y="150" text-anchor="middle" font-size="14" font-weight="700" fill="#065f46">自我學習層</text>
  <text x="602" y="170" text-anchor="middle" font-size="11" fill="#6b7280">預測 → 驗證 → 知識</text>
  <text x="602" y="188" text-anchor="middle" font-size="11" fill="#10b981">MarketReaction 記錄</text>
  <text x="602" y="206" text-anchor="middle" font-size="10" fill="#6b7280">1h / 24h 實際驗證</text>
  <text x="602" y="222" text-anchor="middle" font-size="10" fill="#6b7280">知識條目自動建立</text>
  <text x="602" y="238" text-anchor="middle" font-size="10" fill="#6b7280">注入未來 LLM Prompt</text>
  <text x="602" y="254" text-anchor="middle" font-size="10" fill="#6b7280">矛盾保護：自動降信心</text>
  <!-- Feedback arrow back to tank -->
  <path d="M 522 200 Q 480 360 130 360 Q 80 360 60 340" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#ma)"/>
  <text x="280" y="373" text-anchor="middle" font-size="11" fill="#10b981">知識回饋 → 更精準的資產評分</text>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">Munger 三層架構：市場水缸（評分狀態）← 事件驅動層（即時分析）← 時間驅動層（每日彙整）← 自我學習層（知識閉環）</figcaption>
</figure>

---

## 事件驅動分析管道

每一則新聞都經歷三層過濾，才決定是否觸發 LLM 分析。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 700 310" xmlns="http://www.w3.org/2000/svg" style="max-width:700px;width:100%;font-family:'Segoe UI',Arial,sans-serif">
  <defs>
    <marker id="mb" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#64748b"/></marker>
    <marker id="mbr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#ef4444"/></marker>
  </defs>
  <rect width="700" height="310" fill="#f8fafc" rx="16"/>
  <text x="350" y="30" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">新聞分析管道：從訊號到資產評分</text>
  <!-- News input -->
  <rect x="10" y="55" width="90" height="60" rx="10" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="55" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#075985">RSS</text>
  <text x="55" y="96" text-anchor="middle" font-size="11" fill="#0284c7">每30分</text>
  <text x="55" y="110" text-anchor="middle" font-size="10" fill="#6b7280">掃描</text>
  <line x1="100" y1="85" x2="130" y2="85" stroke="#64748b" stroke-width="1.5" marker-end="url(#mb)"/>
  <!-- Filter -->
  <rect x="130" y="55" width="90" height="60" rx="10" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
  <text x="175" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#1d4ed8">關鍵詞</text>
  <text x="175" y="96" text-anchor="middle" font-size="11" fill="#3b82f6">過濾</text>
  <text x="175" y="110" text-anchor="middle" font-size="10" fill="#6b7280">地緣·商品·宏觀</text>
  <line x1="220" y1="85" x2="250" y2="85" stroke="#64748b" stroke-width="1.5" marker-end="url(#mb)"/>
  <!-- Score -->
  <rect x="250" y="55" width="90" height="60" rx="10" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="295" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#6d28d9">評分</text>
  <text x="295" y="96" text-anchor="middle" font-size="11" fill="#8b5cf6">0–100</text>
  <text x="295" y="110" text-anchor="middle" font-size="10" fill="#6b7280">高權重+15</text>
  <line x1="340" y1="85" x2="370" y2="85" stroke="#64748b" stroke-width="1.5" marker-end="url(#mb)"/>
  <!-- Decision -->
  <polygon points="405,58 445,85 405,112 365,85" fill="#fef9c3" stroke="#eab308" stroke-width="2"/>
  <text x="405" y="82" text-anchor="middle" font-size="11" font-weight="700" fill="#713f12">≥60?</text>
  <text x="405" y="96" text-anchor="middle" font-size="10" fill="#92400e">自動觸發</text>
  <!-- No path -->
  <line x1="445" y1="85" x2="490" y2="85" stroke="#64748b" stroke-width="1.5" marker-end="url(#mb)"/>
  <text x="466" y="78" text-anchor="middle" font-size="10" fill="#94a3b8">否</text>
  <rect x="490" y="60" width="75" height="50" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="527" y="83" text-anchor="middle" font-size="11" fill="#94a3b8">記錄</text>
  <text x="527" y="100" text-anchor="middle" font-size="10" fill="#cbd5e1">等待人工</text>
  <!-- Yes path down -->
  <line x1="405" y1="112" x2="405" y2="150" stroke="#8b5cf6" stroke-width="2" marker-end="url(#mb)"/>
  <text x="416" y="135" font-size="10" fill="#8b5cf6">是</text>
  <!-- LLM Engine -->
  <rect x="290" y="150" width="230" height="60" rx="10" fill="#1e293b"/>
  <text x="405" y="177" text-anchor="middle" font-size="13" font-weight="700" fill="#f1f5f9">LLM 多引擎分析</text>
  <text x="405" y="197" text-anchor="middle" font-size="11" fill="#94a3b8">平行共識（雙 Provider）/ 單引擎 · 第二層思考</text>
  <!-- Arrow down -->
  <line x1="405" y1="210" x2="405" y2="240" stroke="#64748b" stroke-width="2" marker-end="url(#mb)"/>
  <!-- Impact JSON -->
  <rect x="250" y="240" width="150" height="50" rx="10" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
  <text x="325" y="261" text-anchor="middle" font-size="12" font-weight="700" fill="#075985">Asset Impact</text>
  <text x="325" y="280" text-anchor="middle" font-size="10" fill="#0284c7">8 資產 × 方向 × 信心度</text>
  <!-- Arrow right -->
  <line x1="400" y1="265" x2="440" y2="265" stroke="#64748b" stroke-width="2" marker-end="url(#mb)"/>
  <!-- Score Update -->
  <rect x="440" y="240" width="140" height="50" rx="10" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="510" y="261" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">評分更新</text>
  <text x="510" y="280" text-anchor="middle" font-size="10" fill="#10b981">MungerAssetScore −10~+10</text>
  <!-- Urgent path note -->
  <rect x="10" y="170" width="120" height="55" rx="8" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="70" y="190" text-anchor="middle" font-size="11" font-weight="700" fill="#b91c1c">緊急事件</text>
  <text x="70" y="206" text-anchor="middle" font-size="10" fill="#ef4444">war/nuclear/bank run</text>
  <text x="70" y="220" text-anchor="middle" font-size="10" fill="#6b7280">放大 ×1.2 / 快速衰減</text>
  <line x1="130" y1="197" x2="290" y2="180" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#mbr)"/>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">新聞評分達 60 分自動觸發 LLM 分析，輸出 8 資產影響評估，即時更新水缸中的資金流向分數</figcaption>
</figure>

關鍵設計決策：觸發閾值（`auto_threshold = 60`）儲存在資料庫，可透過 API 動態調整。緊急事件（war/nuclear/bank failure 等）走獨立快速路徑，放大係數 1.2，衰減半衰期僅 3 天——反映地緣衝突的高強度但短期性。

---

## 每日輪動合成報告

每天 07:05，系統推送兩則 Telegram 訊息。第一則是指標統計（準確率、知識條目、系統警示），第二則是 LLM 資金輪動合成——這是真正的市場洞察。

合成報告的核心問題框架：

| 欄位 | 問題 |
|------|------|
| `rotation_theme` | 當前主導輪動主題是什麼？ |
| `capital_flows` | 資金在流出哪裡、流入哪裡？強度如何？ |
| `tail_risk_radar` | 哪個資產正在累積尾端風險？洩洪去向？ |
| `flow_forecast_1_4w` | 未來 1–4 週的資金流向主軸？ |
| `opportunity_map` | 哪些資產定價不足（underreacted）？ |
| `predictions_to_revisit` | 哪些開放預測需要修正方向？ |
| `second_level_insight` | 市場共識最擁擠的方向是什麼？逆向路徑？ |

這個框架強迫 LLM 以「資金守恆」的視角思考：每個流出都對應一個流入，而不是孤立地評估每個資產。

---

## 自我學習與自我修復循環

Munger 不只分析市場，它也在分析自己的分析品質。

<figure style="text-align:center;margin:2rem 0">
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" style="max-width:700px;width:100%;font-family:'Segoe UI',Arial,sans-serif">
  <defs>
    <marker id="mc" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#3b82f6"/></marker>
    <marker id="mcr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#ef4444"/></marker>
  </defs>
  <rect width="700" height="400" fill="#f8fafc" rx="16"/>
  <text x="350" y="30" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">自我學習（外環）× 自我修復（內環）</text>
  <!-- Outer ring nodes -->
  <!-- LLM Analysis - top -->
  <rect x="255" y="48" width="190" height="58" rx="10" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
  <text x="350" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#6d28d9">LLM 分析輸出</text>
  <text x="350" y="90" text-anchor="middle" font-size="11" fill="#8b5cf6">8 資產 × 方向 × 信心度</text>
  <text x="350" y="104" text-anchor="middle" font-size="10" fill="#6b7280">→ MarketReaction 記錄建立</text>
  <!-- Market Verification - right -->
  <rect x="540" y="155" width="150" height="72" rx="10" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="615" y="178" text-anchor="middle" font-size="13" font-weight="700" fill="#075985">市場驗證</text>
  <text x="615" y="196" text-anchor="middle" font-size="11" fill="#0284c7">1h / 24h 實際價格</text>
  <text x="615" y="212" text-anchor="middle" font-size="10" fill="#6b7280">correct / incorrect / neutral</text>
  <!-- Weekly Review - bottom -->
  <rect x="235" y="305" width="230" height="58" rx="10" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/>
  <text x="350" y="328" text-anchor="middle" font-size="13" font-weight="700" fill="#9d174d">週回顧分析</text>
  <text x="350" y="346" text-anchor="middle" font-size="11" fill="#ec4899">失敗模式 · 知識條目 · 權重建議</text>
  <text x="350" y="360" text-anchor="middle" font-size="10" fill="#6b7280">週一 07:00 · 最少 3 筆才執行</text>
  <!-- Knowledge - left -->
  <rect x="10" y="155" width="150" height="88" rx="10" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="85" y="178" text-anchor="middle" font-size="13" font-weight="700" fill="#065f46">知識條目</text>
  <text x="85" y="196" text-anchor="middle" font-size="11" fill="#10b981">MungerKnowledgeEntry</text>
  <text x="85" y="212" text-anchor="middle" font-size="10" fill="#6b7280">lesson ≤ 200 字</text>
  <text x="85" y="226" text-anchor="middle" font-size="10" fill="#6b7280">矛盾 ≥3 次 → 信心降低</text>
  <text x="85" y="240" text-anchor="middle" font-size="10" fill="#10b981">注入未來 LLM Prompt</text>
  <!-- Outer ring arrows -->
  <path d="M 445 77 Q 560 80 575 155" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#mc)"/>
  <path d="M 600 227 Q 590 305 465 320" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#mc)"/>
  <path d="M 235 340 Q 110 340 100 243" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#mc)"/>
  <path d="M 85 155 Q 90 80 255 77" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#mc)"/>
  <!-- Outer ring labels -->
  <text x="545" y="118" font-size="10" fill="#3b82f6">每小時 :30</text>
  <text x="550" y="276" font-size="10" fill="#3b82f6">週一 07:00</text>
  <text x="105" y="295" font-size="10" fill="#3b82f6">自動建立 ≤5條</text>
  <text x="100" y="110" font-size="10" fill="#3b82f6">注入 Prompt</text>
  <!-- Inner ring: Weight adjustment -->
  <rect x="245" y="168" width="210" height="68" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="350" y="192" text-anchor="middle" font-size="13" font-weight="700" fill="#92400e">⚙ 自動權重調整</text>
  <text x="350" y="210" text-anchor="middle" font-size="11" fill="#f59e0b">每日 06:50 · 14 天準確率</text>
  <text x="350" y="226" text-anchor="middle" font-size="10" fill="#6b7280">EVENT_WEIGHTS · SOURCE_AMPLIFIERS</text>
  <!-- Inner arrows -->
  <path d="M 455 190 Q 510 150 540 175" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#mcr)"/>
  <path d="M 245 210 Q 180 210 160 195" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#mcr)"/>
  <text x="490" y="148" font-size="10" fill="#ef4444">準確率→</text>
  <text x="490" y="160" font-size="10" fill="#ef4444">調整觸發</text>
  <!-- Legend -->
  <line x1="20" y1="380" x2="50" y2="380" stroke="#3b82f6" stroke-width="2"/>
  <text x="58" y="384" font-size="11" fill="#555">自我學習（外環）</text>
  <line x1="200" y1="380" x2="230" y2="380" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,3"/>
  <text x="238" y="384" font-size="11" fill="#555">自我修復（內環）</text>
  <text x="470" y="384" font-size="10" fill="#94a3b8">兩個循環共用同一套準確率數據</text>
</svg>
<figcaption style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">外環知識學習：分析→驗證→知識→Prompt（每週閉環）；內環評分修復：準確率→調整權重→評分精度提升（每日閉環）</figcaption>
</figure>

兩個循環的設計邏輯：

**外環（知識學習）** 處理的是「分析邏輯」層面的問題——預測方向錯了，是因為對某種市場機制理解有偏差？週回顧把這些偏差提煉成知識條目，下次遇到類似情境時 LLM 會看到這個教訓。

**內環（評分修復）** 處理的是「評分機制」層面的問題——某類事件的影響一直被高估？`auto_adjust_weights()` 每天 06:50 自動微調 `EVENT_WEIGHTS`，讓評分體系逐漸對齊真實市場反應。

---

## 尚待補強的缺口

系統已運行一段時間，以下是我觀察到的改進方向：

**每日合成缺乏跨日比較**：今天的 `rotation_theme` 是「避險輪動」，昨天是「風險再開啟」——這個方向轉變比任何單日分析都更重要，但目前報告沒有呈現。改進方向是注入前日快照，讓 LLM 標注「延續 / 轉向 / 反轉」。

**週回顧建議無推送機制**：自動調整的建議（`weight_suggestions`）生成後進入 `pending` 狀態等待審批，但沒有 Telegram 通知。建議容易被遺忘，自我修復效果因此打折。

**新聞源缺少亞洲視角**：目前主要是英文 RSS，亞洲盤的地緣事件可能有數小時延遲才進入英文媒體。

**LLM Provider 雙點同時失聯時無備援**：重大事件發生時如果 Gemini 和 Claude 同時不可用，分析管道完全停止。緊急事件最需要分析，卻是服務最不穩定的時候。

---

## 這和 AgenticOps 的關係

Munger 系統是 AgenticOps 四階段循環在「市場情報」領域的具體實現：

- **計畫**：確認哪些市場事件值得深入分析（SBE 思維：從使用者需要的洞察反推）
- **開發**：每次新聞觸發分析都是一次「小型開發循環」，LLM 輸出即更新評分
- **驗證**：24 小時後自動對比預測方向與實際市場走勢
- **回饋學習**：錯誤預測 → 週回顧 → 知識條目 → 注入下次分析

唯一的差別是節奏：軟體開發的循環以「功能」為單位，Munger 的循環以「市場事件」為單位，每天跑幾十次小循環、每週跑一次大回顧。

*系統使用 [Claude Code](https://claude.ai/code) 建構與持續演化。*
