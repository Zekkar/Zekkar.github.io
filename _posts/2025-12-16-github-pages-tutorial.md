---
title: "使用 GitHub Pages 建立個人部落格教學"
date: 2025-12-16
categories:
  - 技術
tags:
  - GitHub Pages
  - Jekyll
  - 教學
excerpt: "手把手教你如何使用 GitHub Pages 和 Jekyll 建立免費的個人部落格。"
toc: true
toc_sticky: true
---

## 什麼是 GitHub Pages？

GitHub Pages 是 GitHub 提供的免費靜態網站託管服務。你可以用它來：

- 建立個人部落格
- 展示專案文檔
- 製作個人履歷網站

## 前置需求

在開始之前，你需要：

- 一個 GitHub 帳號
- 基本的 Git 操作知識
- 文字編輯器（如 VS Code）

## 建立步驟

### 1. 建立 Repository

在 GitHub 上建立一個名為 `username.github.io` 的 repository，其中 `username` 是你的 GitHub 使用者名稱。

### 2. 設定 Jekyll

建立 `_config.yml` 檔案：

```yaml
title: 我的部落格
description: 個人技術部落格
remote_theme: "mmistakes/minimal-mistakes"
```

### 3. 撰寫文章

在 `_posts` 資料夾中建立 Markdown 檔案，檔名格式為：

```
YYYY-MM-DD-文章標題.md
```

### 4. 推送到 GitHub

```bash
git add .
git commit -m "Initial blog setup"
git push origin main
```

## 常用技巧

### 插入程式碼

使用三個反引號包圍程式碼區塊：

```python
def hello_world():
    print("Hello, World!")
```

### 插入圖片

```markdown
![圖片說明](/assets/images/example.jpg)
```

### 插入連結

```markdown
[連結文字](https://example.com)
```

## 結語

GitHub Pages 是一個強大且免費的部落格平台。希望這篇教學能幫助你開始你的部落格之旅！
