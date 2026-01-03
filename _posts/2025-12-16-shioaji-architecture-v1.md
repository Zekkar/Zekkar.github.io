---
title: "Shioaji專案架構V1.0"
date: 2025-12-16
categories:
  - 技術
tags:
  - Shioaji
  - 系統架構
  - Python
excerpt: "ShioajiPy 系統架構設計文檔，包含前端、API Gateway、核心微服務層與資料來源層的完整架構圖。"
toc: true
toc_sticky: true
---

## 系統架構圖

```mermaid
graph TD
    %% 定義風格 (CSS Classes)
    classDef layer fill:#f0f8ff,stroke:#333,stroke-width:2px;
    classDef apiGateway fill:#fffacd,stroke:#da4,stroke-width:2px;
    classDef microservice fill:#f5fffa,stroke:#2aa,stroke-width:2px;
    classDef dataSource fill:#e6f3ff,stroke:#09f,stroke-width:2px;
    classDef infra fill:#f0f0f0,stroke:#666,stroke-width:2px;

    subgraph User ["使用者端"]
        FE["React Frontend (Web UI)"]:::layer
    end

    subgraph APIGateway ["API Gateway"]
        BE["FastAPI Backend"]:::apiGateway
    end

    subgraph Microservices ["微服務層"]
        HStrategy["H-Strategy"]:::microservice
        DualSell["Dual-Sell Balance"]:::microservice
        ChickenWing["Chicken Wing Strategy"]:::microservice
        Notification["Notification Service"]:::microservice
        ForceRecorder["Force Recorder"]:::microservice
    end

    subgraph DataSource ["資料來源層"]
        GW["Shioaji Gateway"]:::dataSource
    end

    subgraph Infrastructure ["基礎設施層"]
        Redis["Redis (Pub/Sub, Hash, Stream)"]:::infra
        ShioajiAPI["Shioaji API (永豐金證券)"]:::infra
    end

    %% 關聯與資料流
    FE -- "HTTP / WebSocket" --> BE
    
    %% Gateway 核心資料流
    ShioajiAPI -- "行情/合約" --> GW
    GW -- "Redis 發布 (Pub/Sub)" --> Redis
    
    %% API Gateway 與 Redis 訂閱
    Redis -- "Redis 訂閱 (行情/狀態)" --> BE
    
    %% API Gateway 代理微服務
    BE -- "REST API 路由代理" --> HStrategy
    BE -- "REST API 路由代理" --> DualSell
    BE -- "REST API 路由代理" --> ChickenWing
    
    %% 微服務間/與 Redis 互動
    GW -- "內部 API" --> HStrategy
    GW -- "內部 API" --> DualSell
    GW -- "內部 API" --> ChickenWing
    
    Redis -- "Redis 訂閱 (T 字報價)" --> ForceRecorder
    DualSell -- "策略狀態發布 (Pub/Sub)" --> Redis
    DualSell -- "通知請求" --> Notification
```

## 架構說明

這是一個自我學習用的程式架構，因為個人對於程式交易有一些興趣，因此使用了ShioajiAPI來做為學習標的，使用上相對簡單，學習資源也多。

由於開發目標是期貨與選擇權，與股票標的相比，同時需要訂閱的商品數量較多，但由於Shioaji有單一實例最大的產品訂閱限制，因此採取訂閱一次使用多次的策略，透過實作核心API Gateway的方式，子系統透過內部發布訂閱去取得即時資訊做判斷以及觸發，保持系統的簡潔跟高效，目前仍有許多細節需要完善的，這主要是紀錄開發歷程的心得以及想法，以方便日後回顧跟討論。

