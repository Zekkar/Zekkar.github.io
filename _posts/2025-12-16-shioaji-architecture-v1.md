---
title: "Shioaji專案架構V1.0"
date: 2025-12-16
categories:
  - 技術
tags:
  - Shioaji
  - 系統架構
  - Python
  - 微服務
excerpt: "ShioajiPy 系統架構設計文檔，包含前端、API Gateway、核心微服務層與資料來源層的完整架構圖。"
toc: true
toc_sticky: true
---

## 系統架構圖

<pre class="mermaid">
flowchart TB
 subgraph UserLayer["使用者端"]
        FE["React Frontend (Web UI) &lt;br&gt; [Container: React/TS | 報價/策略管理介面]"]
  end
 subgraph APIGateway["API Gateway"]
        BE["FastAPI Backend &lt;br&gt; [Container: FastAPI/Python | API 路由代理/WebSocket Manager]"]
  end
 subgraph StrategyServices["策略與決策服務 (聚合區)"]
    direction TB
        HStrategy["H-Strategy &lt;br&gt; [Container: FastAPI/Python | H 模型回測/模擬倉管理]"]
        DualSell["Dual-Sell Balance &lt;br&gt; [Container: FastAPI/Python | 雙賣平衡策略引擎]"]
        ChickenWing["Chicken Wing Strategy &lt;br&gt; [Container: FastAPI/Python | 雞翅鴨翅策略引擎]"]
  end
 subgraph CoreServices["核心微服務層"]
    direction LR
        StrategyServices
        Notification["Notification Service &lt;br&gt; [Container: FastAPI/Python | Telegram 通知服務]"]
        ForceRecorder["Force Recorder &lt;br&gt; [Container: Python | 力道快照記錄]"]
  end
 subgraph DataSource["資料來源層"]
        GW["Shioaji Gateway &lt;br&gt; [Container: FastAPI/Python | 唯一連線 Shioaji API]"]
  end
 subgraph ShioajiPySystem["ShioajiPy 系統架構"]
    direction TB
        UserLayer
        APIGateway
        CoreServices
        DataSource
  end
 subgraph InfrastructureAndExternal["基礎設施與外部系統 (系統邊界外)"]
    direction LR
        Redis["Redis &lt;br&gt; [Data Store: 7.0+ | Pub/Sub, Hash, Stream]"]
        ShioajiAPI["永豐金證券 Shioaji API &lt;br&gt; [External System | 行情/交易介面]"]
  end
    FE -- HTTP / WebSocket --> BE
    BE -- REST API 路由代理 --> HStrategy & DualSell & ChickenWing
    GW -- 內部 API (行情/合約) --> HStrategy & DualSell & ChickenWing
    DualSell -- 通知請求 (HTTP) --> Notification
    DualSell -- 策略狀態發布 (Pub/Sub) --> Redis
    GW -- Redis 發布 (Pub/Sub) --> Redis
    Redis -- Redis 訂閱 (行情/狀態) --> BE
    Redis -- Redis 訂閱 (T 字報價) --> ForceRecorder
    ShioajiAPI -- 行情訂閱/交易 --> GW

     FE:::Container
     BE:::Container
     HStrategy:::Container
     DualSell:::Container
     ChickenWing:::Container
     Notification:::Container
     ForceRecorder:::Container
     GW:::Container
     Redis:::Database
     ShioajiAPI:::External
    classDef External fill:#6A5ACD,stroke:#333,color:#FFF
    classDef Container fill:#4386BE,stroke:#333,color:#FFF
    classDef Database fill:#6E3524,stroke:#333,color:#FFF
</pre>

## 架構說明

<!-- 請在此處撰寫架構說明內容 -->

