---
title: "從黑盒到透明：衍生品交易系統的可觀測性架構實踐"
date: 2026-03-31
categories:
  - 技術
tags:
  - Observability
  - Prometheus
  - Grafana
  - DevOps
  - 交易系統
excerpt: "在單台 VM 上運行 35 個容器的交易系統，如何用 Prometheus + Loki + Tempo 建立完整的可觀測性三支柱？從指標、日誌到追蹤，再加上獨立的 Telegram 告警通道，打造不依賴人眼的自動監控體系。"
toc: true
toc_sticky: true
---

## 前言

交易系統最可怕的不是崩潰 — 崩潰至少會被注意到。最可怕的是**靜默失敗**：服務看起來正常，但報價已經停止更新、策略已經不再觸發、數據已經悄悄偏移。

我的兩套衍生品交易系統（Shioaji 微服務群 + IBAPI 單體）共 35 個容器運行在同一台 VM 上。隨著服務數量增長，我逐步建立了一套基於**可觀測性三支柱（Metrics / Logs / Traces）**的監控架構，再加上獨立於監控堆疊的 Telegram 告警通道，確保系統問題能在第一時間被發現和處理。

> **可觀測性不是「看 Dashboard」，是「系統能自己告訴你哪裡有問題」。**

---

## 架構全景

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" style="width:100%;height:auto;max-width:100%;" font-family="'Noto Sans TC','Segoe UI',sans-serif">
  <defs>
    <filter id="s"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#667eea"/><stop offset="100%" stop-color="#764ba2"/></linearGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f093fb"/><stop offset="100%" stop-color="#f5576c"/></linearGradient>
    <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4facfe"/><stop offset="100%" stop-color="#00f2fe"/></linearGradient>
    <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#43e97b"/><stop offset="100%" stop-color="#38f9d7"/></linearGradient>
    <linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fa709a"/><stop offset="100%" stop-color="#fee140"/></linearGradient>
    <marker id="ar" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#bbb"/></marker>
  </defs>
  <rect width="800" height="620" rx="12" fill="#1e1e2e"/>
  <text x="400" y="30" text-anchor="middle" font-size="22" font-weight="bold" fill="#e0e0e0">可觀測性三支柱架構</text>
  <text x="400" y="50" text-anchor="middle" font-size="13" fill="#999">Metrics · Logs · Traces · Independent Alerting</text>

  <!-- 應用層 -->
  <g filter="url(#s)">
    <rect x="10" y="68" width="780" height="75" rx="12" fill="#2a2a3e" stroke="#3a3a5e"/>
    <text x="35" y="92" font-size="15" font-weight="bold" fill="#e0e0e0">應用層 — 35 個容器</text>
    <rect x="30" y="103" width="145" height="30" rx="6" fill="url(#g1)" opacity="0.8"/><text x="102" y="123" text-anchor="middle" font-size="11" fill="white" font-weight="bold">Shioaji (15 微服務)</text>
    <rect x="185" y="103" width="130" height="30" rx="6" fill="url(#g2)" opacity="0.8"/><text x="250" y="123" text-anchor="middle" font-size="11" fill="white" font-weight="bold">IBAPI (API+Web)</text>
    <rect x="325" y="103" width="80" height="30" rx="6" fill="url(#g3)" opacity="0.8"/><text x="365" y="123" text-anchor="middle" font-size="11" fill="white" font-weight="bold">MudWeb</text>
    <rect x="415" y="103" width="100" height="30" rx="6" fill="url(#g4)" opacity="0.8"/><text x="465" y="123" text-anchor="middle" font-size="11" fill="#1a1a2e" font-weight="bold">MultiAgent</text>
    <rect x="525" y="103" width="70" height="30" rx="6" fill="#e74c3c" opacity="0.8"/><text x="560" y="123" text-anchor="middle" font-size="11" fill="white" font-weight="bold">Redis</text>
    <rect x="605" y="103" width="85" height="30" rx="6" fill="#3498db" opacity="0.8"/><text x="647" y="123" text-anchor="middle" font-size="11" fill="white" font-weight="bold">PostgreSQL</text>
    <rect x="700" y="103" width="75" height="30" rx="6" fill="#9b59b6" opacity="0.8"/><text x="737" y="123" text-anchor="middle" font-size="11" fill="white" font-weight="bold">Traefik</text>
  </g>

  <!-- 三個箭頭向下 -->
  <line x1="200" y1="143" x2="200" y2="168" stroke="#4facfe" stroke-width="2" marker-end="url(#ar)"/>
  <text x="200" y="162" text-anchor="middle" font-size="9" fill="#4facfe">metrics</text>
  <line x1="400" y1="143" x2="400" y2="168" stroke="#43e97b" stroke-width="2" marker-end="url(#ar)"/>
  <text x="400" y="162" text-anchor="middle" font-size="9" fill="#43e97b">logs</text>
  <line x1="600" y1="143" x2="600" y2="168" stroke="#f093fb" stroke-width="2" marker-end="url(#ar)"/>
  <text x="600" y="162" text-anchor="middle" font-size="9" fill="#f093fb">traces</text>

  <!-- Pillar 1: Metrics -->
  <g filter="url(#s)">
    <rect x="10" y="172" width="250" height="200" rx="12" fill="#1a1a2e" stroke="#4facfe" stroke-width="1.5"/>
    <text x="135" y="196" text-anchor="middle" font-size="14" font-weight="bold" fill="#4facfe">Pillar 1: Metrics</text>
    <rect x="30" y="208" width="210" height="30" rx="6" fill="rgba(79,172,254,0.12)"/><text x="135" y="228" text-anchor="middle" font-size="12" fill="#4facfe" font-weight="bold">Prometheus (15s scrape)</text>
    <text x="35" y="258" font-size="10" fill="#999">Exporters:</text>
    <text x="35" y="274" font-size="10" fill="#e0e0e0">• node-exporter → CPU/Mem/Disk</text>
    <text x="35" y="290" font-size="10" fill="#e0e0e0">• cAdvisor → 容器指標</text>
    <text x="35" y="306" font-size="10" fill="#e0e0e0">• redis-exporter → Redis ops</text>
    <text x="35" y="322" font-size="10" fill="#e0e0e0">• Traefik → HTTP 延遲/狀態</text>
    <text x="35" y="338" font-size="10" fill="#e0e0e0">• Docker SD → 自動發現</text>
    <rect x="30" y="350" width="210" height="16" rx="4" fill="rgba(245,87,108,0.12)"/><text x="135" y="362" text-anchor="middle" font-size="9" fill="#f5576c">→ Alertmanager → Slack 3 頻道</text>
  </g>

  <!-- Pillar 2: Logs -->
  <g filter="url(#s)">
    <rect x="275" y="172" width="250" height="200" rx="12" fill="#1a1a2e" stroke="#43e97b" stroke-width="1.5"/>
    <text x="400" y="196" text-anchor="middle" font-size="14" font-weight="bold" fill="#43e97b">Pillar 2: Logs</text>
    <rect x="295" y="208" width="210" height="30" rx="6" fill="rgba(67,233,123,0.12)"/><text x="400" y="228" text-anchor="middle" font-size="12" fill="#43e97b" font-weight="bold">Promtail → Loki</text>
    <text x="300" y="258" font-size="10" fill="#999">Scrape Jobs:</text>
    <text x="300" y="274" font-size="10" fill="#e0e0e0">• docker-containers (全部)</text>
    <text x="300" y="290" font-size="10" fill="#e0e0e0">• shioaji-logs (結構化解析)</text>
    <text x="300" y="306" font-size="10" fill="#e0e0e0">• ibapi-logs (結構化解析)</text>
    <text x="300" y="322" font-size="10" fill="#e0e0e0">• syslog (系統日誌)</text>
    <rect x="295" y="340" width="210" height="25" rx="4" fill="rgba(67,233,123,0.08)"/><text x="300" y="357" font-size="9" fill="#43e97b">JSON pipeline: log → level label 提取</text>
  </g>

  <!-- Pillar 3: Traces -->
  <g filter="url(#s)">
    <rect x="540" y="172" width="250" height="200" rx="12" fill="#1a1a2e" stroke="#f093fb" stroke-width="1.5"/>
    <text x="665" y="196" text-anchor="middle" font-size="14" font-weight="bold" fill="#f093fb">Pillar 3: Traces</text>
    <rect x="560" y="208" width="210" height="30" rx="6" fill="rgba(240,147,251,0.12)"/><text x="665" y="228" text-anchor="middle" font-size="12" fill="#f093fb" font-weight="bold">Tempo (OTLP)</text>
    <text x="565" y="258" font-size="10" fill="#999">接收端:</text>
    <text x="565" y="274" font-size="10" fill="#e0e0e0">• OTLP gRPC (:4317)</text>
    <text x="565" y="290" font-size="10" fill="#e0e0e0">• OTLP HTTP (:4318)</text>
    <text x="565" y="306" font-size="10" fill="#e0e0e0">• Zipkin (:9411)</text>
    <text x="565" y="322" font-size="10" fill="#e0e0e0">• Jaeger (:14268)</text>
    <rect x="560" y="340" width="210" height="25" rx="4" fill="rgba(240,147,251,0.08)"/><text x="565" y="357" font-size="9" fill="#f093fb">ShioajiPy OpenTelemetry SDK 主動推送</text>
  </g>

  <!-- Grafana -->
  <g filter="url(#s)">
    <rect x="10" y="392" width="520" height="70" rx="12" fill="#2a2a3e" stroke="#ffa94d" stroke-width="1.5"/>
    <text x="35" y="418" font-size="15" font-weight="bold" fill="#ffa94d">Grafana — 統一視覺化</text>
    <rect x="30" y="432" width="95" height="22" rx="5" fill="rgba(255,169,77,0.12)"/><text x="77" y="448" text-anchor="middle" font-size="9" fill="#ffa94d">system-overview</text>
    <rect x="133" y="432" width="105" height="22" rx="5" fill="rgba(255,169,77,0.12)"/><text x="185" y="448" text-anchor="middle" font-size="9" fill="#ffa94d">container-metrics</text>
    <rect x="246" y="432" width="95" height="22" rx="5" fill="rgba(255,169,77,0.12)"/><text x="293" y="448" text-anchor="middle" font-size="9" fill="#ffa94d">resource-usage</text>
    <rect x="349" y="432" width="80" height="22" rx="5" fill="rgba(255,169,77,0.12)"/><text x="389" y="448" text-anchor="middle" font-size="9" fill="#ffa94d">service-logs</text>
    <rect x="437" y="432" width="75" height="22" rx="5" fill="rgba(255,169,77,0.12)"/><text x="474" y="448" text-anchor="middle" font-size="9" fill="#ffa94d">error-logs</text>
  </g>

  <!-- Independent Alert -->
  <g filter="url(#s)">
    <rect x="545" y="392" width="245" height="70" rx="12" fill="#2e2a1e" stroke="#d4b86a" stroke-width="1.5"/>
    <text x="570" y="418" font-size="15" font-weight="bold" fill="#d4b86a">獨立告警通道</text>
    <text x="570" y="436" font-size="10" fill="#e0e0e0">health_monitor.py</text>
    <text x="570" y="452" font-size="10" fill="#e0e0e0">→ Telegram 推送（不依賴監控堆疊）</text>
  </g>

  <!-- 網路拓撲 -->
  <g filter="url(#s)">
    <rect x="10" y="480" width="780" height="55" rx="12" fill="url(#g1)" opacity="0.85"/>
    <text x="400" y="505" text-anchor="middle" font-size="15" font-weight="bold" fill="white">Docker Networks: infra-network ↔ shioaji-network ↔ ibapi-network</text>
    <text x="400" y="525" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.7)">跨網路服務發現 · Prometheus 多網路 scrape · Tempo 跨專案 trace 收集</text>
  </g>

  <!-- 管理入口 -->
  <g filter="url(#s)">
    <rect x="10" y="550" width="780" height="55" rx="12" fill="#2a2a3e" stroke="#3a3a5e"/>
    <text x="35" y="575" font-size="14" font-weight="bold" fill="#e0e0e0">管理入口</text>
    <rect x="120" y="562" width="100" height="28" rx="6" fill="rgba(79,172,254,0.12)"/><text x="170" y="581" text-anchor="middle" font-size="11" fill="#4facfe">Homepage</text>
    <rect x="235" y="562" width="120" height="28" rx="6" fill="rgba(79,172,254,0.12)"/><text x="295" y="581" text-anchor="middle" font-size="11" fill="#4facfe">Traefik Dashboard</text>
    <rect x="370" y="562" width="100" height="28" rx="6" fill="rgba(79,172,254,0.12)"/><text x="420" y="581" text-anchor="middle" font-size="11" fill="#4facfe">Portainer</text>
    <rect x="485" y="562" width="80" height="28" rx="6" fill="rgba(79,172,254,0.12)"/><text x="525" y="581" text-anchor="middle" font-size="11" fill="#4facfe">Grafana</text>
    <rect x="580" y="562" width="100" height="28" rx="6" fill="rgba(79,172,254,0.12)"/><text x="630" y="581" text-anchor="middle" font-size="11" fill="#4facfe">Prometheus</text>
    <rect x="695" y="562" width="80" height="28" rx="6" fill="rgba(79,172,254,0.12)"/><text x="735" y="581" text-anchor="middle" font-size="11" fill="#4facfe">Seq</text>
  </g>
</svg>

整個監控堆疊和交易系統共存於同一台 VM，透過 Docker 的 bridge network 互相連接。

---

## Pillar 1：Metrics — 用數字描述系統狀態

Metrics 回答的問題是：**「系統現在怎麼樣？」** — CPU 多少、記憶體剩多少、每秒處理幾個請求、延遲是多少。

### 收集架構

Prometheus 每 15 秒主動 scrape 所有資料源：

| Exporter | 職責 | 關鍵指標 |
|----------|------|---------|
| **node-exporter** | 主機層級 | CPU 使用率、記憶體、磁碟 I/O、網路流量 |
| **cAdvisor** | 容器層級 | 每個容器的 CPU/Mem/Net、OOM 事件 |
| **redis-exporter** | Redis | 連線數、ops/sec、記憶體使用、key 數量 |
| **Traefik** | API Gateway | HTTP 狀態碼分佈、請求延遲直方圖 |
| **Docker SD** | 自動發現 | 透過 label `prometheus.scrape=true` 自動註冊 |

### 為什麼用 Docker Service Discovery？

手動維護 `static_configs` 在容器數量多的環境中是不可行的。Docker SD 讓 Prometheus 自動發現標記了 `prometheus.scrape=true` 的容器，並從 label 中讀取 metrics port：

```yaml
- job_name: 'docker-containers'
  docker_sd_configs:
    - host: unix:///var/run/docker.sock
      refresh_interval: 30s
  relabel_configs:
    - source_labels: [__meta_docker_container_label_prometheus_scrape]
      regex: 'true'
      action: keep
```

新增一個微服務時，只需要在 `docker-compose.yml` 加上 label，Prometheus 就會自動開始收集它的指標。**零配置擴展。**

### 告警規則

Alertmanager 根據嚴重程度分流到不同 Slack 頻道：

| 嚴重程度 | 路由 | 等待時間 | 重複間隔 |
|---------|------|---------|---------|
| **Critical** | `#critical-alerts` | 10 秒 | 1 小時 |
| **Warning** | `#infrastructure-alerts` | 1 分鐘 | 4 小時 |
| **Trading** | `#trading-alerts` | 10 秒 | 30 分鐘 |

告警規則分為三個檔案：

- `container.rules.yml` — 容器 OOM、異常重啟、CPU 飆高
- `node.rules.yml` — 主機磁碟空間不足、記憶體壓力、CPU 持續高負載
- `trading.rules.yml` — 交易服務專用（資料收集中斷、策略執行異常）

> **交易系統的告警有獨立路由**，因為這些告警的時效性和重要性與基礎設施告警完全不同 — 錯過一個交易訊號的代價遠高於 CPU 飆到 80%。

---

## Pillar 2：Logs — 用文字記錄發生了什麼

Metrics 告訴你「系統異常」，Logs 告訴你「異常的細節」。兩者的關係是：**Metrics 觸發告警，Logs 定位根因。**

### 收集架構

Promtail 從 Docker 容器的 JSON 日誌中收集，推送到 Loki：

```
Docker 容器 → JSON log driver → Promtail 讀取 → 解析 → Loki 儲存
```

### 四個 Scrape Job 的設計考量

| Job | 目標 | 特殊處理 |
|-----|------|---------|
| **docker-containers** | 所有容器 | 通用 JSON 解析，取得 container name 和 compose project |
| **shioaji-logs** | Shioaji 微服務群 | 二次 JSON 解析提取 `level` label（結構化日誌）|
| **ibapi-logs** | IBAPI 服務 | 同上，提取 `level` 和 `message` |
| **syslog** | 主機系統日誌 | 正則解析 syslog 格式 |

為什麼要分開？因為**不同專案的日誌格式不同**。Shioaji 和 IBAPI 都使用結構化 JSON 日誌，但欄位名稱和結構有差異。通用 job 只做第一層 Docker JSON 解析，專案 job 再做第二層應用程式 JSON 解析，並將 `level` 提取為 Loki label：

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
  - labels:
      level:
```

這樣在 Grafana 中就能用 `{project="shioajipy", level="error"}` 快速過濾錯誤日誌，而不用全文搜索。

### 為什麼不用 ELK？

Loki 的設計哲學是**只索引 label，不索引日誌內容**。這讓它在資源有限的環境中（單台 VM、8GB RAM）特別適用。相比 Elasticsearch 需要大量記憶體來維護全文索引，Loki 的記憶體佔用小得多。

> 在 35 個容器共享 8GB RAM 的環境中，每一個 MB 都很珍貴。

---

## Pillar 3：Traces — 追蹤請求的完整旅程

一個 API 請求從進入系統到返回結果，中間可能經過多個微服務。Traces 回答的問題是：**「這個請求經歷了什麼？在哪裡花了最多時間？」**

### 收集架構

與 Metrics 和 Logs 的「pull 模式」不同，Traces 採用**應用程式主動推送**：

```
ShioajiPy (OpenTelemetry SDK) → OTLP gRPC → Tempo
```

Tempo 支援多種協議接收，但我主要使用 OTLP gRPC：

| 協議 | 端口 | 用途 |
|------|------|------|
| OTLP gRPC | 4317 | ShioajiPy 主要推送通道 |
| OTLP HTTP | 4318 | 備用（防火牆限制 gRPC 時使用）|
| Zipkin | 9411 | 相容舊系統 |
| Jaeger | 14268 | 相容 Jaeger client |

### 記憶體限制的考量

Tempo 被限制在 512MB 記憶體：

```yaml
tempo:
  deploy:
    resources:
      limits:
        memory: 512M
```

這是刻意的 — 在資源受限的 VM 上，**tracing 的優先級低於交易服務本身**。512MB 足以處理我們的 trace 量，但不會搶佔交易策略需要的記憶體。

### Trace 與 Log 的關聯

ShioajiPy 的結構化日誌中包含 `TraceId` 和 `SpanId`：

```json
{
  "event": "查詢力道分析: contract=TX1, date=2026-03-30",
  "TraceId": "3522eb77b668b90a3ec81cb893cce6eb",
  "SpanId": "32d095024290a1b7",
  "Application": "shioaji-backend"
}
```

在 Grafana 中，這讓你可以從一條日誌直接跳轉到對應的 trace，看到整個請求鏈的時序圖。**這就是三支柱的價值 — 不是各自獨立運作，而是互相關聯。**

---

## 獨立告警通道：監控的監控

上面三個支柱都依賴於監控基礎設施本身的健康。如果 Prometheus 掛了、Loki 掛了、Grafana 掛了 — 你的告警也跟著消失了。

這就是為什麼我額外建立了一個**完全獨立的告警通道**：

### health_monitor.py — 三層告警

```
Layer 1: Redis TCP 連線檢查
         ↓ 失敗 → Telegram 告警
Layer 2: ShioajiPy HTTP Health Check（10 個對外服務）
         ↓ 失敗 → Telegram 告警
Layer 3: IBAPI Diagnostics API + 資料庫連線
         ↓ 失敗 → Telegram 告警
```

這個腳本的設計原則：

| 原則 | 說明 |
|------|------|
| **零依賴** | 只使用 Python 標準庫，不需要 pip install 任何東西 |
| **零 token** | 純 HTTP 檢查，不消耗 AI token |
| **獨立運行** | 不依賴 Docker、不依賴監控堆疊、不依賴任何微服務 |
| **直接推送** | 透過 Telegram Bot API 直接發送，不經過任何中間層 |

### 為什麼排除 WS-Gateway？

最初的版本檢查了所有 11 個 Shioaji 服務，但 WS-Gateway 是內部服務，不對外暴露 HTTP 端口。從外部檢查它永遠會失敗，產生**假陽性告警**。移除後，告警準確率從 ~90% 提升到 100%。

> **告警的第一條規則：假陽性比漏報更危險。** 當團隊習慣忽略告警後，真正的問題也會被忽略。

---

## 網路拓撲：跨專案的服務發現

35 個容器分屬不同的 Docker Compose 專案，需要透過外部網路互相連接：

| 網路 | 用途 | 連接的服務 |
|------|------|-----------|
| **infra-network** | 監控元件互連 | Prometheus、Loki、Tempo、Grafana、Alertmanager |
| **shioaji-network** | Shioaji 微服務 + 監控 | 15 個微服務 + Prometheus + Tempo + Redis Exporter |
| **ibapi-network** | IBAPI 服務 + 入口 | API + Web + PostgreSQL + Homepage |

Prometheus 同時加入 `infra-network` 和 `shioaji-network`，這樣它才能 scrape Shioaji 微服務的指標。同理，Tempo 也需要加入 `shioaji-network` 來接收 OTLP trace 推送。

```yaml
networks:
  infra-network:
    name: infra-network
  shioaji-network:
    external: true    # 由 ShioajiPy 的 docker-compose 建立
  ibapi-network:
    name: ibapi-trading_default
    external: true    # 由 IBAPI 的 docker-compose 建立
```

> 這種「監控基礎設施獨立部署，但加入應用網路」的模式，讓監控和應用的生命週期解耦。重啟監控不影響交易，重啟交易不影響監控。

---

## Grafana Dashboard 設計

五個 Dashboard 各有明確職責：

| Dashboard | 資料源 | 核心用途 |
|-----------|--------|---------|
| **system-overview** | Prometheus | 全局一覽：CPU、記憶體、磁碟、網路 |
| **container-metrics** | Prometheus + cAdvisor | 單一容器深入分析 |
| **resource-usage** | Prometheus | 資源使用趨勢，預測容量瓶頸 |
| **service-logs** | Loki | 按服務過濾日誌，關聯 TraceId |
| **error-logs** | Loki | 只顯示 ERROR/FATAL 級別，快速定位問題 |

### 從告警到根因的完整路徑

一個典型的問題排查流程：

```
Alertmanager 發出告警：容器記憶體超過 90%
  ↓
system-overview：確認是哪台主機、哪段時間
  ↓
container-metrics：找到是 shioaji-mud-strategy 佔用最多
  ↓
service-logs：過濾該容器的 ERROR 日誌
  ↓
發現 OOM 前的 warning：「快照數量超過閾值」
  ↓
error-logs：找到根因 — 夜盤跨日查詢返回了雙倍資料量
  ↓
透過 TraceId 跳轉到 Tempo，確認是哪個 API 呼叫觸發
```

**這就是三支柱協同的威力** — 從一個指標告警，一路追蹤到具體的程式碼路徑。

---

## 實際案例：Tempo 重啟事件

以下是一個真實的排查案例，展示可觀測性架構如何幫助快速定位問題：

### 現象

系統健康檢查顯示全部服務正常，但 ShioajiPy 的日誌中出現間歇性的 warning：

```
Transient error StatusCode.UNAVAILABLE encountered
while exporting traces to host.docker.internal:4317,
retrying in 0.84s.
```

### 排查路徑

| 步驟 | 觀察 | 工具 |
|------|------|------|
| 1 | Warning 只出現在 ShioajiPy 的 backend | Loki (service-logs) |
| 2 | 目標是 `:4317` — Tempo 的 OTLP gRPC 端口 | 對照架構圖 |
| 3 | Tempo 容器 uptime 只有 52 分鐘（其他 3-5 天）| `docker ps` |
| 4 | Tempo 重啟前後的記憶體使用接近 512MB 上限 | container-metrics |
| 5 | 重啟後 trace export 自動恢復 | ShioajiPy 日誌中 warning 停止 |

### 根因與處理

Tempo 因記憶體壓力被 OOM killed，Docker 的 `restart: unless-stopped` 自動重啟了它。期間 ShioajiPy 的 OpenTelemetry SDK 偵測到連線失敗，自動執行 exponential backoff（0.84s → 1.02s → 2.04s），等 Tempo 恢復後自動重連。

**不需要人工介入。** 但這個事件暴露了一個潛在風險：如果 VM 記憶體持續吃緊，Tempo 可能會反覆重啟。

---

## 資源約束下的取捨

在 8GB RAM 的 VM 上跑 35 個容器 + 完整監控堆疊，資源取捨是不可避免的：

| 決策 | 理由 |
|------|------|
| Loki 而非 Elasticsearch | 記憶體佔用小一個數量級 |
| Tempo 限制 512MB | Tracing 重要但不能搶交易服務的記憶體 |
| Prometheus 保留 15 天 | 更長的保留需要更多磁碟，15 天足夠分析趨勢 |
| health_monitor.py 用標準庫 | 不額外消耗記憶體，不依賴 runtime |
| 不裝 Jaeger UI | Grafana 已經能查 Tempo 的 trace |

### 記憶體分配現況

```
交易服務 (Shioaji + IBAPI + Redis)  ~3.5 GB
監控堆疊 (Prometheus + Loki + Tempo + Grafana)  ~1.2 GB
系統與其他服務  ~1.0 GB
─────────────────────────────────────────────
已用  ~5.7 GB / 8 GB
Swap 使用  ~1.7 GB
```

Swap 被使用代表記憶體已接近飽和。對於交易系統，這是一個需要持續觀察的指標 — Swap I/O 比 RAM 慢 10-100 倍，可能導致策略執行出現延遲抖動。

---

## 經驗總結

### 1. 可觀測性的本質是關聯

三個支柱單獨運作時各有價值，但真正的威力在於**它們之間的關聯**。從 metric 到 log 到 trace 的一鍵跳轉，讓排查時間從小時級縮短到分鐘級。

### 2. 監控的監控不是多餘的

當你的告警系統依賴於監控基礎設施，你就需要一個不依賴它的備用通道。`health_monitor.py` 的價值不在於平時 — 在於 Prometheus 掛掉的那一天。

### 3. 假陽性是告警系統的頭號殺手

WS-Gateway 的案例證明了這一點。每一個假陽性都在消耗團隊對告警系統的信任。寧可少一個告警，也不要多一個假陽性。

### 4. 資源約束迫使你做更好的設計

8GB RAM 的限制讓我不得不選擇 Loki 而非 ELK、限制 Tempo 記憶體、精簡 Dashboard 數量。這些約束反而產生了一個更簡潔、更容易維護的架構。

### 5. 結構化日誌是基石

如果日誌不是結構化的，Promtail 無法提取 `level` label，Grafana 無法精確過濾，trace 關聯也無法實現。**在系統設計初期就採用結構化日誌，後續的可觀測性才有可能。**

---

## 下一步

目前的架構仍有幾個待改進的方向：

- **health_monitor.py 排程決策**：`--loop` 常駐模式 vs Task Scheduler 定時觸發
- **Tempo 記憶體優化**：評估是否需要調整 trace 採樣率來降低記憶體壓力
- **IBAPI 的 trace 整合**：目前只有 ShioajiPy 有 OpenTelemetry，IBAPI 的 FastAPI 服務尚未接入
- **異常時自動觸發 Claude Code 自癒**：讓 health_monitor.py 在偵測到問題時，自動觸發 `/self-heal` 流程
