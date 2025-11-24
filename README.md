# **Prometheus Global Guardian** 🌍🔥

> **实时全球环境灾害监控与可视化平台** | Real-time Global Environmental Hazards Monitoring Platform

基于 **React 19 + TypeScript 5.9 + Mapbox GL** 构建的现代化全栈应用，整合多个权威数据源（USGS、NASA、GDACS），为全球灾害监测提供实时、直观、交互式的可视化解决方案。

[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?logo=vite)](https://vitejs.dev/)
[![Mapbox](https://img.shields.io/badge/Mapbox_GL-3.15.0-000000?logo=mapbox)](https://www.mapbox.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📋 **目录**

- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [数据源](#数据源)
- [功能展示](#功能展示)
- [开发说明](#开发说明)

---

## ✨ **核心功能**

### 🔍 **多源数据聚合**
- 🌍 **USGS** - 美国地质调查局地震数据实时接入
- 🛰️ **NASA EONET** - 地球观测网络环境事件追踪
- 🚨 **GDACS** - 全球灾害警报和协调系统数据
- 📡 实时数据轮询与自动更新机制

### 🗺️ **3D 地理可视化**
- 🌐 基于 **Mapbox GL** 的交互式3D地球视图
- 📍 动态灾害标记系统（支持多种灾害类型）
- 🎨 自定义颜色编码和图例面板
- 🔄 流畅的地图交互体验（缩放、旋转、倾斜）

### 📊 **智能数据分析**
- 🏷️ 按灾害类型筛选（地震、火山、风暴、洪水、野火等）
- 📈 实时统计面板显示各类灾害数量
- 🔎 灾害详情查看（时间、位置、强度等信息）
- 📉 数据可视化与趋势分析

### 📄 **报告导出与分享**
- 💾 一键导出灾害报告（HTML格式）
- 📤 支持数据保存与离线查看
- 📋 可定制的报告模板

### ⚙️ **现代化交互体验**
- 🎛️ 设置面板与配置管理
- ⌨️ 键盘快捷键支持（ESC关闭模态框）
- 🖱️ 点击遮罩层关闭交互
- 📱 响应式设计，适配多种设备

---

## 🏗️ **技术架构**

### **前端技术栈**
| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.1.1 | 现代化 UI 库，组件化开发 |
| **TypeScript** | 5.9.3 | 类型安全，提升代码质量 |
| **Vite** | 7.1.7 | 极速构建工具与 HMR 热更新 |
| **Mapbox GL** | 3.15.0 | 高性能地图可视化引擎 |

### **后端技术栈**
| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18.x+ | 服务器运行环境（支持 20.x, 22.x） |
| **Express** | 5.1.0 | RESTful API 框架 |
| **Node Fetch** | 3.3.2 | HTTP 请求库，用于数据聚合 |

### **开发工具链**
- **ESLint** 9.36.0 - 代码规范与质量检查
- **TypeScript ESLint** 8.45.0 - TS 专用 Lint 规则
- **React Hooks Linter** - React Hooks 最佳实践检查
- **Serve** 14.2.0 - 生产环境静态文件服务器

### **架构特点**
- ✅ 完全组件化的 React 架构设计
- ✅ TypeScript 严格类型检查，零 `any` 使用
- ✅ 模块化配置管理（灾害类型、颜色映射等）
- ✅ 前后端分离，RESTful API 设计
- ✅ Vite 开发服务器，HMR 毫秒级响应

## **项目结构**

```
prometheus-global-guardian/
├── public/
│   └── assets/              # 静态资源（logo 等）
│       ├── prometheus-logo.jpeg
│       └── prometheus-logo.png
├── src/
│   ├── index.tsx            # 应用入口
│   ├── index.css            # 全局样式
│   ├── App.tsx              # 主应用组件
│   ├── components/          # 功能组件
│   │   ├── Header.tsx
│   │   ├── StatusPanel.tsx
│   │   ├── LegendPanel.tsx
│   │   ├── MapView.tsx
│   │   ├── SaveReportModal.tsx
│   │   └── SettingsModal.tsx
│   ├── api/                 # API 接口
│   │   ├── auth.ts
│   │   └── disasteraware.ts
│   ├── config/              # 配置文件
│   │   ├── displayedTypes.ts
│   │   ├── hazardColors.ts
│   │   └── index.ts
│   └── types/               # 类型定义
│       └── index.ts
├── server.js                # Express 服务器
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── Dockerfile
└── README.md
```

## 🚀 **快速开始**

### **环境要求**
- Node.js 18.x 或更高版本（推荐 20.x）
- npm 或 yarn 包管理器
- Mapbox Access Token（必需，用于地图功能）

### **环境配置**

**重要：获取 Mapbox Token**

1. 访问 [Mapbox 官网](https://account.mapbox.com/access-tokens/)
2. 注册或登录账户（免费）
3. 创建新的 Access Token
4. 复制 token 并配置到项目中

**配置步骤：**

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 文件，添加你的 Mapbox token
# VITE_MAPBOX_TOKEN=pk.your_actual_mapbox_token_here
```

### **安装与运行**

```bash
# 1. 克隆项目
git clone https://github.com/Jamie-qian/prometheus-global-guardian.git
cd prometheus-global-guardian

# 2. 安装依赖
npm install

# 3. 配置环境变量（见上方"环境配置"）
# 编辑 .env 文件添加 Mapbox token

# 4. 启动开发服务器
npm run dev

# 5. 浏览器访问
# 打开 http://localhost:5173
```

> ⚠️ **注意**: 如果不配置有效的 Mapbox token，地图将无法正常显示

### **生产环境部署**

```bash
# 构建生产版本
npm run build

# 本地预览构建结果
npm run preview

# 使用 serve 部署静态文件
npm start
```

### **可用脚本命令**

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（热更新） |
| `npm run build` | 构建生产环境代码到 `dist/` |
| `npm run preview` | 预览生产构建结果 |
| `npm run lint` | 运行 ESLint 代码检查 |
| `npm start` | 使用 serve 启动生产服务器 |

---

## 🌐 **数据源**

本项目整合以下权威数据源，确保灾害信息的准确性和实时性：

| 数据源 | 提供方 | 数据类型 | 更新频率 |
|--------|--------|----------|----------|
| **USGS** | 美国地质调查局 | 全球地震数据 | 实时 |
| **NASA EONET** | 美国航空航天局 | 环境事件（野火、风暴等） | 每日 |
| **GDACS** | 联合国 & 欧盟委员会 | 全球灾害警报 | 实时 |

---

## 🎯 **功能展示**

### **灾害类型支持**

- 🔴 **地震 (Earthquake)** - 震级、深度、位置
- 🌋 **火山 (Volcano)** - 喷发状态、影响范围
- 🌪️ **风暴 (Storm)** - 热带气旋、飓风
- 🌊 **洪水 (Flood)** - 洪水预警与监测
- 🔥 **野火 (Wildfire)** - 火灾位置与蔓延
- 🌡️ **极端温度 (Temperature)** - 高温/低温事件
- 💨 **其他灾害** - 干旱、冰雪、海啸等

### **界面组件**

- **Header** - 顶部导航栏与标题
- **MapView** - 主地图视图组件
- **StatusPanel** - 实时统计面板
- **LegendPanel** - 图例与灾害类型说明
- **SettingsModal** - 设置与配置面板
- **SaveReportModal** - 报告导出对话框

---

## 💡 **开发说明**

### **项目特点**

- ✅ **多数据源聚合** - 整合 USGS、NASA、GDACS 三大权威数据源
- ✅ **3D 地图可视化** - Mapbox GL 高性能渲染引擎
- ✅ **类型安全** - TypeScript 严格模式，减少运行时错误
- ✅ **组件化架构** - 高度模块化，易于维护和扩展
- ✅ **现代化工具链** - Vite + ESLint，开发体验极佳
- ✅ **响应式设计** - 适配桌面端和移动端

### **代码规范**

- 使用 ESLint + TypeScript ESLint 进行代码检查
- 遵循 React Hooks 最佳实践
- 组件采用函数式编程风格
- 配置文件模块化管理（`config/` 目录）

### **配置说明**

```typescript
// src/config/hazardColors.ts - 灾害类型颜色映射
// src/config/displayedTypes.ts - 显示的灾害类型配置
// src/config/index.ts - 全局配置导出
```

---

## 📝 **许可证**

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 👨‍💻 **作者**

**Jamie Qian** - [@Jamie-qian](https://github.com/Jamie-qian)

---

## 🙏 **致谢**

感谢以下数据提供方：
- 美国地质调查局 (USGS)
- 美国航空航天局 (NASA)
- 全球灾害警报和协调系统 (GDACS)

---

<p align="center">
  <strong>⭐ 如果这个项目对你有帮助，欢迎 Star ⭐</strong>
</p>