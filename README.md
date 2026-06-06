# TidyMind — AI 知识工作空间

> 基于 React Native 构建的智能笔记管理应用，深度整合 Vivo AIGC 平台大模型能力。
> UI 设计源自 [Figma 设计稿](https://figma.com/design/UTwDtr261uT6tPxo0Hjxdi)。

[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)]()
[![React Native](https://img.shields.io/badge/react--native-0.85.3-61dafb)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.8-3178c6)]()

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [应用导航](#应用导航)
- [功能详解](#功能详解)
  - [🏠 首页](#-首页)
  - [🔄 知识回顾](#-知识回顾)
  - [⭐ 收藏](#-收藏)
  - [👤 我的](#-我的)
  - [🤖 AI 助手](#-ai-助手)
  - [📝 笔记详情](#-笔记详情)
  - [📥 导入知识](#-导入知识)
  - [📤 导出笔记](#-导出笔记)
- [设计系统](#设计系统)
- [AI 能力](#ai-能力)
- [数据模型](#数据模型)
- [构建与部署](#构建与部署)
- [依赖说明](#依赖说明)
- [故障排查](#故障排查)

---

## 功能概览

TidyMind 是一个全功能的 AI 驱动知识管理工具，将传统笔记管理与前沿 AI 能力深度结合：

| 功能模块 | 说明 |
|---------|------|
| 📝 **结构化笔记** | 13 种 Block 类型，Notion 风格编辑，Markdown 预览 |
| 🤖 **AI 助手** | 7 种工作模式：对话/问答/翻译/写作/识图/绘图/笔记生成 |
| 📚 **RAG 问答** | 向量召回 + 精排 + LLM 生成，基于笔记库的智能问答 |
| 🎨 **AI 文生图** | 文字描述 → Doubao-Seedream-4.5 生成图片 |
| 📷 **图片识别** | 多模态视觉理解，拍照 OCR → 结构化笔记 |
| 🔍 **智能搜索** | AI 语义搜索 + 本地关键词过滤 |
| 📊 **知识回顾** | 日/周/月统计，AI 学习总结，卡片式浏览 |
| 📤 **导出** | Markdown（YAML front matter）+ PDF（本地离线生成） |
| 📥 **AI 导入** | 链接/文本 → AI 自动提取标题+标签+摘要 |
| 📍 **学习地点** | POI 搜索，笔记关联地理位置 |
| 🛡️ **内容安全** | 三层防护：客户端过滤 + LLM 审核 + 输出脱敏 |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React Native 0.85.3 |
| 语言 | TypeScript 5.8 |
| 导航 | React Navigation 7（Bottom Tabs + Native Stack） |
| 状态管理 | React Context + AsyncStorage 本地持久化 |
| UI 设计 | Material Design 3（紫色系 Tonal Surface） |
| Markdown | marked 18 + KaTeX 数学公式渲染 |
| AI 接口 | OpenAI SDK → Vivo AIGC 平台（OpenAI 兼容协议） |
| 动画 | React Native Animated API + LayoutAnimation |
| 存储 | @react-native-async-storage/async-storage |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 22.11.0
- **React Native CLI** 开发环境（[配置指南](https://reactnative.dev/docs/set-up-your-environment)）
- **Android Studio**（Android 开发）
- **Xcode**（iOS 开发，仅 macOS）

### 安装

```bash
# 1. 克隆项目
git clone <repo-url>
cd TidyMind

# 2. 安装所有依赖
npm install

# 3. iOS 原生依赖（仅 macOS）
cd ios && pod install && cd ..
```

> **提示**: 在 IntelliJ IDEA 中打开项目时，IDEA 会自动检测 `package.json` 并提示运行 `npm install`。

### 配置 AI 能力

编辑 `App.tsx` 第 42 行，替换为你的 Vivo AIGC 平台 AppKey：

```typescript
setLLMAppKey('你的AppKey');
```

AppKey 获取地址：https://aigc.vivo.com.cn/#/platform

### 运行

```bash
# 启动 Metro 开发服务器
npm start

# 另一个终端：运行 Android
npm run android

# 或运行 iOS
npm run ios
```

保存代码后自动热更新（Fast Refresh）。

---

## 项目结构

```
TidyMind/
├── App.tsx                          # 应用入口，导航配置，自定义 TabBar
├── index.js                         # Metro 打包入口
├── package.json                     # 依赖配置
├── tsconfig.json                    # TypeScript 配置
│
├── src/
│   ├── components/                  # 可复用 UI 组件
│   │   ├── BlockEditor.tsx          # 块编辑器（插入/删除/排序，500ms 防抖自动保存）
│   │   ├── BlockRenderer.tsx        # 结构化笔记渲染器（13 种 Block 类型）
│   │   ├── MarkdownView.tsx         # 零依赖 Markdown 渲染（marked lexer → RN 原生组件）
│   │   ├── MathRenderer.tsx         # LaTeX 数学公式渲染（KaTeX）
│   │   ├── NoteCard.tsx             # 笔记卡片（双列网格，按压缩放动画）
│   │   └── NoteEditorModal.tsx      # 笔记编辑弹窗（标题/标签/地点/图片附件/AI 标签推荐）
│   │
│   ├── screens/                     # 页面
│   │   ├── SplashScreen.tsx         # 启动屏（淡入动画 + Logo + 加载点）
│   │   ├── HomeScreen.tsx           # 首页（问候/搜索/标签筛选/笔记网格/FAB）
│   │   ├── AssistantScreen.tsx      # AI 助手（7 模式对话/文件上传/拍照/保存为笔记）
│   │   ├── ReviewScreen.tsx         # 知识回顾（日/周/月统计 + 卡片浏览 + AI 总结）
│   │   ├── FavoritesScreen.tsx      # 收藏笔记
│   │   ├── FilesScreen.tsx          # 文件管理（类型筛选/拍照 OCR/标签）
│   │   ├── NotesScreen.tsx          # 笔记列表（文本搜索/标签过滤）
│   │   ├── ProfileScreen.tsx        # 个人中心（统计/导出/导入/设置入口）
│   │   ├── NoteDetailScreen.tsx     # 笔记详情（阅读/编辑双模式，TOC/灯箱/沉浸式）
│   │   ├── ImportScreen.tsx         # AI 导入解析（链接/文件/文本）
│   │   ├── ExportScreen.tsx         # 统一导出（Markdown + PDF 双 Tab）
│   │   └── SettingsScreen.tsx       # 设置
│   │
│   ├── services/                    # 业务逻辑服务层
│   │   ├── llm.config.ts            # LLM 配置（AppKey/模型/客户端/UUID 生成）
│   │   ├── llm.ts                   # LLM 调用封装（OpenAI 兼容，支持流式/思考/多模态）
│   │   ├── llm.errors.ts            # Vivo 错误码解析 + 指数退避重试
│   │   ├── prompts.ts               # System Prompt 模板 + 7 种 AI 模式定义
│   │   ├── search.ts                # AI 语义搜索 + RAG 问答 + 笔记去重检测
│   │   ├── embedding.ts             # 文本向量化（bge-base-zh-v1.5）
│   │   ├── rerank.ts                # 结果精排（bge-reranker-large）
│   │   ├── exportMarkdown.ts        # Markdown 转换（YAML front matter）+ 剪贴板/分享
│   │   ├── exportPdf.ts             # PDF 本地离线生成（HTML → 原生打印引擎）
│   │   ├── ocr.ts                   # Vivo OCR API + LLM 结构化提取
│   │   ├── camera.ts                # 拍照/相册选择（权限请求）
│   │   ├── translate.ts             # 多语翻译（中英日韩）
│   │   ├── moderation.ts            # 内容安全过滤（三层防护）
│   │   ├── geo.ts                   # POI 地点搜索
│   │   └── filePicker.ts            # 文件选择器（支持多类型文档）
│   │
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useChat.ts               # AI 聊天状态管理（流式/取消/安全审核/错误处理）
│   │   ├── useSemanticSearch.ts     # 混合搜索（AI 语义 + 本地关键词，AI 搜索总结）
│   │   └── usePhotoToNote.ts        # 拍照 → OCR → LLM 结构化 → 自动创建笔记
│   │
│   ├── state/                       # 全局状态
│   │   └── AppState.tsx             # Context Provider（notes/chatMessages CRUD + 持久化）
│   │
│   ├── storage/                     # 本地持久化
│   │   ├── notesStorage.ts          # 笔记 AsyncStorage 读写
│   │   └── chatStorage.ts           # 聊天记录 AsyncStorage 读写
│   │
│   ├── types/                       # TypeScript 类型定义
│   │   ├── note.ts                  # Note / NoteBlock（13 种）/ NoteLocation
│   │   └── chat.ts                  # ChatMessage
│   │
│   ├── navigation/                  # 导航类型
│   │   └── types.ts                 # RootStackParamList / TabParamList
│   │
│   └── theme/                       # 设计系统
│       └── designTokens.ts          # Colors / Typography / BorderRadius / Spacing / Shadows
│
├── android/                         # Android 原生工程
├── ios/                             # iOS 原生工程
├── icon/                            # 应用图标资源
├── 作品提交/                         # 竞赛提交材料
│   ├── guideline.md                 # 大模型接入技术指南（v2.0）
│   └── api.md                       # Vivo AIGC 平台 API 文档
└── __tests__/                       # 单元测试
```

---

## 应用导航

```
App 启动
  └── SplashScreen（2.5s 动画）
        └── Bottom Tab 导航
              ├── 🏠 首页（HomeScreen）
              ├── 🔄 回顾（ReviewScreen）
              ├── ⭐ 收藏（FavoritesScreen）
              └── 👤 我的（ProfileScreen）
                    ├── 导出笔记 → ExportScreen
                    ├── 导入知识 → ImportScreen
                    └── 设置 → SettingsScreen

Stack 导航（全局可达）
  ├── 🤖 AI 助手（AssistantScreen）
  ├── 📝 笔记详情（NoteDetailScreen）
  ├── 📥 导入（ImportScreen）
  ├── 📤 导出（ExportScreen）
  └── ⚙ 设置（SettingsScreen）
```

**自定义 TabBar**：Figma 风格滑动胶囊动画。选中态显示图标 + 文字标签，非选中态仅显示图标。弹簧物理效果（tension: 200, friction: 15）。

---

## 功能详解

### 🏠 首页

- **问候语**：根据时间自动切换（早上好 / 中午好 / 下午好 / 晚上好 / 夜深了）
- **AI 搜索栏**：输入关键词回车 → AI 语义搜索；实时本地关键词过滤
- **AI Hero 卡片**：紫色背景卡片，快捷进入 AI 助手
- **推荐阅读**：随机展示一篇笔记，点击进入详情
- **标签筛选**：横向滑动标签芯片，点击按标签过滤，支持动画切换
- **笔记网格**：双列网格布局，每张卡片显示标题 / 预览 / 标签 / 更新时间
- **新建笔记**：点击「+ 新建」打开编辑弹窗
- **删除笔记**：长按笔记卡片弹出删除确认
- **FAB**：右下角浮动按钮，快捷进入 AI 助手
- **入场动画**：淡入 + 弹性缩放

---

### 🔄 知识回顾

- **日 / 周 / 月维度切换**：胶囊按钮切换时间粒度
- **日期导航**：左右箭头切换日期，日历弹窗快速跳转
- **统计面板**：笔记数 / 主题数 / 连续天数 / 总字数
- **沉浸式卡片浏览**：横向滑动，主题色封面 + 标签 + 内容预览
- **弹性缩放动画**：当前卡片放大，两侧卡片缩小
- **AI 本周总结**：LLM 自动分析本周学习轨迹，生成 150 字温暖总结
- **创建按钮**：空状态时可直接创建笔记

---

### ⭐ 收藏

- 展示所有收藏笔记（双列网格）
- 支持取消收藏
- 点击笔记可查看详情

---

### 👤 我的

- **个人卡片**：紫色圆形头像（TM）+ 用户名 + 标签
- **统计面板**：笔记数 / 收藏数 / 导出次数
- **快捷操作**：
  - 导出笔记 → ExportScreen（Markdown / PDF）
  - 导入知识 → ImportScreen（AI 解析）
  - 设置 → SettingsScreen

---

### 🤖 AI 助手

核心 AI 交互界面，7 种工作模式通过顶部横向芯片一键切换：

| 模式 | 图标 | 功能描述 |
|------|------|---------|
| **对话** | 💬 | 通用 AI 知识助手，总结笔记、制定学习计划、提取关键行动 |
| **问答** | 📚 | RAG 智能问答，向量召回 → 精排 → LLM 生成，引用来源笔记 |
| **翻译** | 🌐 | 中英日韩互译，自动检测语言，专业术语注释 |
| **写作** | ✍️ | 润色、改写、语法检查、写作指导，提供改写对比 |
| **识图** | 📷 | 拍照或相册选图 → 多模态视觉理解，提取文字/描述内容 |
| **绘图** | 🎨 | 文字描述 → LLM 优化 Prompt → Doubao-Seedream-4.5 生成图片 |
| **笔记** | 📝 | 输入主题 → AI 生成 800-2000 字结构化笔记（多种 Block） |

**交互特性**：
- 模式切换时不清空对话历史，可跨模式连续对话
- 📎 支持上传文件（图片 / PDF / PPT / Word / TXT）→ AI 分析处理
- 💾 每条 AI 回复可「保存为笔记」，自动生成标题和标签
- 🔄 流式响应 + 停止按钮
- 🛡️ 发送前内容安全审核（敏感词过滤）
- 空状态显示当前模式的快捷提示词
- 附件预览：文件/图片芯片，可删除

---

### 📝 笔记详情

#### 阅读模式

- **BlockRenderer**：13 种 Block 类型自适应渲染
  - `heading` → 分级标题，H1 带下划线
  - `paragraph` / `section` → 段落，自动分段
  - `quote` → 紫色左边框引用卡片
  - `tip` → 💡 绿色提示卡片
  - `warning` → ⚠️ 橙色警告卡片
  - `example` → 📝 蓝色案例卡片
  - `conclusion` → 📌 黄色总结卡片
  - `list` → bullet / number / check 列表
  - `table` → 表头 + 斑马纹表格
  - `code` → 暗色代码块 + 语言标签
  - `image` / `divider` → 图片 / 分隔线
- **MarkdownView**：marked lexer → React Native 原生组件，支持 KaTeX 数学公式
- **图片附件**：横向滑动浏览，点击进入灯箱
- **目录导航**：侧滑面板，显示所有标题，点击跳转
- **沉浸式阅读**：隐藏头部和工具栏，底部退出按钮
- **底部工具栏**：📑 目录 / ✏️ 编辑 / ☆ 收藏 / 📖 沉浸

#### 编辑模式

- **BlockEditor**：每个 Block 独立编辑，支持：
  - 添加 Block（段落 / 标题 / 引用 / 列表 / 代码 / 表格 / 图片 / 分隔线）
  - 删除单个 Block
  - 上移 / 下移调整顺序
- **500ms 防抖自动保存**
- **标题 / 标签**：直接编辑，自动保存
- **📎 补充资料**：
  - 上传文件 → 选择补充模式（自动分析最佳位置 / 补充整篇 / 更新总结）
  - AI 智能分析 → 判断插入位置 → 新增内容块

---

### 📥 导入知识

- 三种导入类型：**链接** / **文件** / **文本**
- **AI 解析按钮**：
  - 调用 `Volc-DeepSeek-V3.2` 自动分析内容
  - 提取标题（≤20 字）
  - 推荐标签（2-4 字）
  - 生成摘要（100 字内）
- 支持编辑 AI 解析结果
- 点击「保存」创建笔记

---

### 📤 导出笔记

统一导出界面，格式切换 Tab：

#### Markdown 模式

- **勾选笔记** → 实时预览（暗色等宽字体面板）
- **YAML front matter**：
  ```yaml
  ---
  title: "笔记标题"
  tag: "标签"
  created: "2026-06-06T..."
  updated: "2026-06-06T..."
  ---
  ```
- 兼容 Obsidian / Notion / Typora / VS Code
- **操作**：📋 复制到剪贴板 / 📤 系统分享

#### PDF 模式

- **勾选笔记** → 点击「导出 PDF」
- **本地离线生成**：
  - iOS：`UIPrintPageRenderer` 渲染 HTML → PDF
  - Android：`PrintDocumentAdapter` 渲染 HTML → PDF
- MD3 设计风格排版，中文系统字体完美支持
- 自动分页，支持摘要 / 关键要点 / 13 种 Block
- 文件保存到设备 DocumentDirectory

---

## 设计系统

TidyMind 采用 **Material Design 3** 设计语言，以紫色 `#6750A4` 为主色调。

### 色彩

| Token | 色值 | 用途 |
|-------|------|------|
| `primary` | `#6750A4` | 主色调，按钮背景，活跃态 |
| `primaryContainer` | `#E8DEF8` | 主色容器，Tab 胶囊，标签背景 |
| `onPrimary` | `#FFFFFF` | 主色上的文字（白色） |
| `onPrimaryContainer` | `#1D192B` | 主色容器上的文字（深色） |
| `background` | `#FFFBFE` | 页面背景 |
| `surface` | `#FFFBFE` | 卡片背景 |
| `surfaceContainer` | `#F3EDF7` | 输入框、列表行背景 |
| `surfaceContainerLow` | `#E7E0EC` | 骨架屏、低层级表面 |
| `textPrimary` | `#1C1B1F` | 主文字 |
| `textSecondary` | `#49454F` | 辅助文字 |
| `textTertiary` | `#938F99` | 占位符、时间、三级文字 |
| `outline` | `#79747E` | 轮廓线 |
| `border` | `#CAC4D0` | 边框、分割线 |
| `danger` | `#B3261E` | 删除按钮 |
| `overlay` | `rgba(28,27,31,0.4)` | 弹窗遮罩 |

### 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `xs` | 8px | 标签徽章 |
| `sm` | 12px | 小卡片 |
| `md` | 16px | 输入框、预览面板 |
| `lg` | 24px | 标准卡片 |
| `xl` | 28px | NoteCard |
| `xxl` | 48px | 大圆角 |
| `full` | 9999px | 胶囊按钮、芯片 |

### 阴影

| 级别 | elevation | 用途 |
|------|-----------|------|
| `sm` | 1 | NoteCard |
| `md` | 3 | Hero 区域、推荐阅读卡片 |
| `lg` | 6 | 浮动大卡片 |

### 排版

| 样式 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| `displayLarge` | 36px | 700 | 44px | 大标题 |
| `headlineLarge` | 28px | 500 | 36px | 页面标题 |
| `headlineMedium` | 24px | 500 | 32px | 区域标题 |
| `titleLarge` | 20px | 500 | 28px | 卡片标题 |
| `titleMedium` | 16px | 500 | 24px | 列表标题 |
| `bodyLarge` | 16px | 400 | 26px | 正文 |
| `bodyMedium` | 14px | 400 | 22px | 辅助正文 |
| `bodySmall` | 12px | 400 | 18px | 标注、时间 |
| `labelMedium` | 14px | 500 | 20px | 标签 |
| `labelSmall` | 11px | 500 | 16px | 小标签 |

---

## AI 能力

TidyMind 通过 Vivo AIGC 平台接入多种 AI 能力，采用 **OpenAI 兼容协议**，可直接使用 `openai` npm 包。

### 已集成能力

| 能力 | 模型 / API | 应用场景 |
|------|-----------|---------|
| 文本对话 | Doubao-Seed-2.0-mini | AI 助手对话、写作、翻译 |
| 深度推理 | Volc-DeepSeek-V3.2 | 笔记结构化解析、复杂分析 |
| 多模态理解 | Doubao-Seed-2.0-mini | 图片识别、OCR 增强 |
| 文生图 | Doubao-Seedream-4.5 | AI 绘图（2K 分辨率） |
| 文本向量化 | bge-base-zh-v1.5 | RAG 语义检索 |
| 文本精排 | bge-reranker-large | 搜索结果优化、笔记去重 |
| 通用 OCR | Vivo OCR API | 拍照识别文字 → 结构化笔记 |
| 翻译 | Vivo Translation API | 中英日韩互译 |
| POI 搜索 | Vivo Geo API | 学习地点标记 |

### AI 安全机制

三层内容安全防护：

1. **客户端过滤**（`moderation.ts`）：
   - `blocked` 级别：赌博/色情/诈骗 → 拒绝发送
   - `suspicious` 级别：自残/暴力/政治 → 警告但放行
   - `pass` 级别：正常内容 → 无干预

2. **LLM 内置审核**：Vivo API code 1007 自动触发

3. **输出脱敏**：身份证号/银行卡号/手机号 → `***`

**错误处理**：
- Vivo 错误码解析（`llm.errors.ts`）
- 指数退避重试（429 限流自动重试：2s → 4s → 8s）
- 用量超限提示（code 2003 每日限额）

---

## 数据模型

### Note（笔记）

```typescript
type Note = {
  id: string;
  title: string;
  content: string;           // 纯文本内容（兼容旧数据）
  tag: string;                // 单标签分类
  location?: NoteLocation;    // 关联学习地点
  images?: string[];          // Base64 图片附件
  blocks?: NoteBlock[];       // 结构化笔记块（AI 生成时填充）
  summary?: string;           // AI 生成摘要
  keyPoints?: string[];       // AI 提取关键要点
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
};
```

### NoteBlock（13 种类型）

| 类型 | 说明 | 渲染样式 |
|------|------|---------|
| `heading` | 标题（1/2/3 级） | 粗体，H1 带下划线，自适应间距 |
| `paragraph` | 段落 | 17px，行高 28px |
| `section` | 章节 | 标题 + 多段落，自动间距 |
| `quote` | 引用 | 紫色 3px 左边框 + 灰色背景 |
| `tip` | 小技巧 | 💡 绿色 4px 左边框 + 浅绿背景 |
| `warning` | 警告 | ⚠️ 橙色 4px 左边框 + 浅橙背景 |
| `example` | 案例 | 📝 蓝色 4px 左边框 + 浅蓝背景 |
| `conclusion` | 总结 | 📌 黄色 4px 左边框 + 浅黄背景 |
| `list` | 列表 | 支持 `bullet` / `number` / `check` |
| `table` | 表格 | 表头灰色背景 + 斑马纹数据行 |
| `code` | 代码块 | 暗色背景 (#1e1e1e) + monospace 字体 |
| `image` | 图片 | 圆角图片，点击进入灯箱 |
| `divider` | 分隔线 | 细灰色分割线 |

### ChatMessage（聊天消息）

```typescript
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;       // 单张图片（向后兼容）
  images?: string[];          // 多张图片
  generatedImage?: string;    // AI 生成图片 URL
  createdAt: string;
};
```

---

## 构建与部署

### 开发环境

```bash
# 启动 Metro
npm start

# 启动 Metro（清除缓存）
npm start -- --reset-cache

# 运行 Android
npm run android

# 运行 iOS
npm run ios
```

### Release APK 构建

```bash
cd android

# 清理
.\gradlew.bat clean

# 构建 Release
.\gradlew.bat assembleRelease

# APK 输出路径
# android/app/build/outputs/apk/release/app-release.apk
```

### iOS Release（仅 macOS）

```bash
# 用 Xcode 打开
open ios/TidyMind.xcworkspace

# Product → Archive → Distribute App
```

### 原生模块注意事项

以下包包含原生代码，添加/更新后需重新 build：

| 包 | 需要 iOS pod install | 需要 Android rebuild |
|----|---------------------|---------------------|
| `react-native-gesture-handler` | ✅ | ✅ |
| `react-native-screens` | ✅ | ✅ |
| `react-native-safe-area-context` | ✅ | ✅ |
| `react-native-image-picker` | ✅ | ✅ |
| `react-native-html-to-pdf` | ✅ | ✅ |
| `@react-native-async-storage/async-storage` | ✅ | ✅ |
| `@react-native-documents/picker` | ✅ | ✅ |

---

## 依赖说明

### 运行时依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `react` | 19.2.3 | React 核心 |
| `react-native` | 0.85.3 | React Native 框架 |
| `@react-navigation/native` | ^7.0.14 | 导航核心 |
| `@react-navigation/bottom-tabs` | ^7.1.3 | 底部 Tab |
| `@react-navigation/native-stack` | ^7.1.3 | Stack 导航 |
| `react-native-gesture-handler` | ^2.21.2 | 手势系统 |
| `react-native-screens` | ^4.9.2 | 原生屏幕优化 |
| `react-native-safe-area-context` | ^5.5.2 | 刘海屏/底部安全区域 |
| `@react-native-async-storage/async-storage` | ^2.1.0 | 本地持久化存储 |
| `react-native-image-picker` | ^7.2.3 | 相机拍照 / 相册选择 |
| `react-native-html-to-pdf` | ^0.12.0 | HTML → PDF 原生渲染 |
| `@react-native-documents/picker` | ^12.0.1 | 文件选择器 |
| `openai` | ^6.41.0 | OpenAI SDK（Vivo 平台兼容） |
| `marked` | ^18.0.5 | Markdown 解析 |
| `katex` | ^0.17.0 | LaTeX 数学公式渲染 |
| `@react-native/new-app-screen` | 0.85.3 | RN 模板屏幕 |

### 开发依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `typescript` | ^5.8.3 | 类型检查 |
| `@react-native/typescript-config` | 0.85.3 | RN TS 预设 |
| `@react-native/babel-preset` | 0.85.3 | Babel 预设 |
| `@react-native/eslint-config` | 0.85.3 | ESLint 预设 |
| `@react-native/metro-config` | 0.85.3 | Metro 打包配置 |
| `@react-native/jest-preset` | 0.85.3 | Jest 测试预设 |
| `@babel/core` | ^7.25.2 | Babel 编译器 |
| `eslint` | ^8.19.0 | 代码检查 |
| `prettier` | 2.8.8 | 代码格式化 |
| `jest` | ^29.6.3 | 单元测试 |

---

## 故障排查

### Metro 打包缓存问题

```bash
npm start -- --reset-cache
```

### Android 构建问题

```bash
cd android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
```

### 原生模块未链接

如果运行时提示原生模块为 `null`：

1. 确认包在 `node_modules` 中存在
2. 重新 build 应用（`assembleRelease` / Xcode build）
3. 检查原生模块是否在 `react-native.config.js` 中

### AI 功能不可用

1. 检查 `App.tsx` 中 `setLLMAppKey()` 是否配置了有效 AppKey
2. 检查设备网络连接
3. 查看 AI 搜索栏状态栏的错误信息

### Node 版本不匹配

项目要求 Node.js ≥ 22.11.0。使用 `node -v` 检查当前版本。

---

> **TidyMind** — 让知识整理变得简单而智能。
