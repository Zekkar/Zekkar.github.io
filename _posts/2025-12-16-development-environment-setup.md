---
title: "建立開發環境"
date: 2025-12-16
categories:
  - 技術
tags:
  - DevOps
  - Docker
  - 監控
  - Observability
  - Infrastructure
excerpt: "完整的開發環境架構說明，包含可觀測性三大支柱：Metrics、Logs、Tracing 的監控維度與各自作用。"
toc: true
toc_sticky: true
---

## 系統架構總覽

> **VM**: Ubuntu Linux

<pre class="mermaid">
flowchart TB
    subgraph User["使用者存取"]
        Browser["瀏覽器"]
    end

    subgraph Portal["統一入口"]
        Homepage["Homepage Portal"]
    end

    subgraph ShioajiPy["ShioajiPy<br/>台股選擇權交易系統"]
        SF["Frontend"]
        SB["Backend API"]
        SG["Gateway"]
        SFR["Force Recorder"]
    end

    subgraph IBAPI["IBAPI Trading<br/>IB 美股交易系統<br/>"]
        IW["Web Frontend"]
        IA["Backend API"]
        IP["PostgreSQL"]
        IAD["Adminer"]
    end

    subgraph Infra["Infrastructure<br/>基礎設施"]
        direction TB
        Grafana["Grafana"]
        Traefik["Traefik"]
        Portainer["Portainer"]

        subgraph Metrics["📊 Metrics 監控"]
            Prometheus["Prometheus"]
            Alertmanager["Alertmanager"]
        end

        subgraph Logs["📝 Logs 監控"]
            Loki["Loki"]
            Promtail["Promtail"]
        end

        subgraph Tracing["🔍 Tracing 監控"]
            Tempo["Tempo"]
        end
    end

    subgraph SharedServices["共用服務"]
        Redis["Redis"]
        subgraph Exporters["指標收集器"]
            NodeExp["Node Exporter"]
            cAdvisor["cAdvisor"]
            RedisExp["Redis Exporter"]
        end
    end

    Browser --> Homepage
    Homepage --> ShioajiPy
    Homepage --> IBAPI
    Homepage --> Infra

    SF --> SB
    SB --> SG
    SB --> Redis
    SFR --> Redis

    IW --> IA
    IA --> IP

    Prometheus --> Exporters
    Promtail --> Loki
    Metrics --> Grafana
    Logs --> Grafana
    Tracing --> Grafana
    Prometheus --> Alertmanager

    classDef metrics fill:#e1f5fe,stroke:#0288d1,color:#01579b
    classDef logs fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c
    classDef tracing fill:#fff3e0,stroke:#f57c00,color:#e65100
    classDef portal fill:#e8f5e9,stroke:#388e3c,color:#1b5e20

    class Prometheus,Alertmanager,NodeExp,cAdvisor,RedisExp metrics
    class Loki,Promtail logs
    class Tempo tracing
    class Homepage portal
</pre>

---

## 可觀測性三大支柱 (Observability)

本系統採用 **Grafana LGTM Stack**，涵蓋可觀測性三大支柱：

<pre class="mermaid">
flowchart LR
    subgraph Pillars["可觀測性三大支柱"]
        direction TB

        subgraph M["📊 Metrics<br/>指標監控<br/>"]
            M1["數值型時序資料"]
            M2["系統健康狀態"]
            M3["效能趨勢分析"]
        end

        subgraph L["📝 Logs<br/>日誌監控<br/>"]
            L1["事件記錄"]
            L2["錯誤追蹤"]
            L3["行為分析"]
        end

        subgraph T["🔍 Traces<br/>分散式追蹤<br/>"]
            T1["請求路徑追蹤"]
            T2["服務間延遲"]
            T3["瓶頸定位"]
        end
    end

    subgraph Tools["對應工具"]
        Prometheus["Prometheus"]
        Loki["Loki"]
        Tempo["Tempo"]
    end

    subgraph Viz["統一視覺化"]
        Grafana["Grafana"]
    end

    M --> Prometheus
    L --> Loki
    T --> Tempo
    Prometheus --> Grafana
    Loki --> Grafana
    Tempo --> Grafana

    classDef metrics fill:#e1f5fe,stroke:#0288d1,color:#01579b
    classDef logs fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c
    classDef tracing fill:#fff3e0,stroke:#f57c00,color:#e65100
    classDef grafana fill:#ff9800,stroke:#e65100,color:#fff

    class M,Prometheus metrics
    class L,Loki logs
    class T,Tempo tracing
    class Grafana grafana
</pre>

---

## 📊 Metrics（指標監控）

### 什麼是 Metrics？

**Metrics** 是以數值形式記錄的時序資料，用於量化系統的運行狀態。

### 核心元件

| 元件 | 作用 |
|------|------|
| **Prometheus** | 時序資料庫，負責收集、儲存指標並執行告警規則 |
| **Alertmanager** | 告警管理，負責去重、分組、路由告警通知 |
| **Node Exporter** | 收集系統層級指標（CPU、Memory、Disk、Network） |
| **cAdvisor** | 收集 Docker 容器資源使用指標 |
| **Redis Exporter** | 收集 Redis 效能指標 |

### Metrics 的作用

```
┌─────────────────────────────────────────────────────────┐
│  Metrics 解決的問題                                      │
├─────────────────────────────────────────────────────────┤
│  ✅ 系統現在健康嗎？                                     │
│  ✅ CPU/Memory 使用率是多少？                            │
│  ✅ API 回應時間是否正常？                               │
│  ✅ 過去一週的趨勢如何？                                 │
│  ✅ 什麼時候該擴容？                                     │
│  ✅ 是否需要發送告警？                                   │
└─────────────────────────────────────────────────────────┘
```

### 告警規則範例

| 告警 | 觸發條件 | 說明 |
|------|---------|------|
| CPU 過高 | CPU > 80% 持續 5 分鐘 | 系統負載過重 |
| 記憶體不足 | Memory > 85% | 可能發生 OOM |
| 磁碟空間 | Disk > 90% | 即將耗盡儲存空間 |
| 容器異常 | 容器重啟次數 > 3 | 服務不穩定 |
| API 錯誤率 | Error Rate > 1% | 服務可能有問題 |

---

## 📝 Logs（日誌監控）

### 什麼是 Logs？

**Logs** 是應用程式產生的文字記錄，包含事件發生的詳細資訊。

### 核心元件

| 元件 | 作用 |
|------|------|
| **Loki** | 日誌聚合系統，負責儲存和查詢日誌 |
| **Promtail** | 日誌收集 Agent，從各容器抓取 stdout/stderr |

### 日誌收集架構

<pre class="mermaid">
flowchart LR
    subgraph Sources["日誌來源"]
        D1["Docker 容器<br/>stdout/stderr"]
        D2["系統日誌<br/>/var/log/syslog"]
    end

    subgraph Collection["收集層"]
        Promtail["Promtail<br/>日誌收集 Agent"]
    end

    subgraph Storage["儲存層"]
        Loki["Loki<br/>日誌聚合"]
    end

    subgraph Query["查詢層"]
        Grafana["Grafana<br/>LogQL 查詢"]
    end

    D1 --> Promtail
    D2 --> Promtail
    Promtail --> Loki
    Loki --> Grafana

    classDef logs fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c
    class Promtail,Loki logs
</pre>

### Logs 的作用

```
┌─────────────────────────────────────────────────────────┐
│  Logs 解決的問題                                         │
├─────────────────────────────────────────────────────────┤
│  ✅ 錯誤發生時的詳細資訊是什麼？                         │
│  ✅ 使用者執行了什麼操作？                               │
│  ✅ 某個時間點發生了什麼事？                             │
│  ✅ 為什麼這個請求失敗了？                               │
│  ✅ 異常行為的上下文是什麼？                             │
└─────────────────────────────────────────────────────────┘
```

### 常用 LogQL 查詢

| 需求 | 查詢語法 |
|------|---------|
| 所有容器日誌 | `{job="docker-containers"}` |
| 特定容器 | `{container="prometheus"}` |
| 搜尋錯誤 | `{job="docker-containers"} \|~ "(?i)error"` |
| ShioajiPy 日誌 | `{compose_project="shioajipy"}` |
| 排除健康檢查 | `{job="docker-containers"} != "health check"` |

### 資料保留

- **保留期限**: 30 天 (`720h`)

---

## 🔍 Tracing（分散式追蹤）

### 什麼是 Tracing？

**Tracing** 追蹤單一請求在分散式系統中的完整路徑，記錄經過的每個服務和耗費的時間。

### 核心元件

| 元件 | 作用 |
|------|------|
| **Tempo** | 分散式追蹤後端，儲存和查詢 Trace 資料 |
| **OTLP gRPC** | OpenTelemetry gRPC 協議接收端 |
| **OTLP HTTP** | OpenTelemetry HTTP 協議接收端 |
| **Zipkin** | Zipkin 協議相容接收端 |
| **Jaeger** | Jaeger 協議相容接收端 |

### Tracing 的作用

```
┌─────────────────────────────────────────────────────────┐
│  Tracing 解決的問題                                      │
├─────────────────────────────────────────────────────────┤
│  ✅ 請求經過了哪些服務？                                 │
│  ✅ 每個服務花了多少時間？                               │
│  ✅ 效能瓶頸在哪裡？                                     │
│  ✅ 哪個服務導致了延遲？                                 │
│  ✅ 服務間的依賴關係是什麼？                             │
└─────────────────────────────────────────────────────────┘
```

### Trace 範例結構

<pre class="mermaid">
flowchart LR
    subgraph Trace["一個完整的 Trace"]
        direction TB

        A["Span: Frontend<br/>⏱️ 總計 250ms"] --> B["Span: API Gateway<br/>⏱️ 15ms"]
        B --> C["Span: Backend Service<br/>⏱️ 180ms"]
        C --> D["Span: Database Query<br/>⏱️ 45ms"]
        C --> E["Span: Redis Cache<br/>⏱️ 5ms"]
    end

    classDef trace fill:#fff3e0,stroke:#f57c00,color:#e65100
    class A,B,C,D,E trace
</pre>

### 資料保留

- **保留期限**: 7 天

---

## 三大支柱比較

| 維度 | Metrics | Logs | Tracing |
|------|---------|------|---------|
| **資料類型** | 數值時序 | 文字事件 | 請求路徑 |
| **儲存工具** | Prometheus | Loki | Tempo |
| **查詢語言** | PromQL | LogQL | TraceQL |
| **主要用途** | 監控告警 | 除錯分析 | 效能優化 |
| **資料量** | 小 | 中~大 | 中 |
| **保留期限** | 15 天 | 30 天 | 7 天 |
| **回答問題** | 發生了什麼？ | 為什麼發生？ | 在哪裡發生？ |

---

## 統一視覺化 - Grafana

所有監控資料最終匯聚到 **Grafana** 進行統一視覺化：

| Dashboard | 用途 |
|-----------|------|
| 系統總覽 | CPU、記憶體、磁碟、網路總覽 |
| 容器指標 | 各容器資源使用率 |
| 服務日誌 | 即時日誌串流 |
| 錯誤日誌 | 錯誤/警告過濾與統計 |

---

## Docker 網路架構

<pre class="mermaid">
flowchart TB
    subgraph infra["infra-network"]
        direction LR
        G["Grafana"]
        P["Prometheus"]
        L["Loki"]
        T["Tempo"]
        TR["Traefik"]
        CA["cAdvisor"]
        NE["Node Exp"]
        PT["Promtail"]
        AM["Alertmanager"]
        PO["Portainer"]
        RE["Redis Exp"]
        HP["Homepage"]
    end

    subgraph shioaji["shioaji-network"]
        direction LR
        SG["shioaji-gateway"]
        SB["shioaji-backend"]
        SF["shioaji-frontend"]
        SFR["force-recorder"]
        RD["Redis"]
    end

    subgraph ibapi["ibapi-trading_default"]
        direction LR
        IW["ibapi-web"]
        IA["ibapi-api"]
        IPG["ibapi-postgres"]
        IAD["ibapi-adminer"]
    end

    infra <-.-> |跨網路連接| shioaji
    infra <-.-> |跨網路連接| ibapi

    classDef infra fill:#e3f2fd,stroke:#1976d2
    classDef shioaji fill:#e8f5e9,stroke:#388e3c
    classDef ibapi fill:#fff3e0,stroke:#f57c00

    class G,P,L,T,TR,CA,NE,PT,AM,PO,RE,HP infra
    class SG,SB,SF,SFR,RD shioaji
    class IW,IA,IPG,IAD ibapi
</pre>
