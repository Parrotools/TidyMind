# TidyMind — 知识工作空间

基于 [**React Native**](https://reactnative.dev) 的知识管理应用，UI 设计来自 [Figma 设计稿](https://figma.com/design/UTwDtr261uT6tPxo0Hjxdi)。

## 功能特性
- **首页** — 知识工作空间：搜索、快捷操作和统计概览
- **文件** — 笔记管理：按类型筛选（全部/文字/链接/视频照片/录音）、标签、收藏、创建/编辑/删除
- **AI 助手** — 对话式 AI 助手，支持快速提示和本地历史
- **收藏** — 查看已收藏的笔记
- **我的** — 个人资料、统计数据、导入/导出入口、设置
- **Markdown 编辑器** — 支持文本格式化、图片/链接插入、标签添加等功能
## 设计系统
UI 布局和组件基于 Figma 设计稿重构：
- 色彩方案：灰度色系（#262626 / #4d4d4d / #b2b2b2）
- 圆角：4px（标签）/ 8px（卡片）/ 12px（输入框）/ 16px（头像）/ 100px（胶囊按钮）
- 底部导航：胶囊式活跃态指示器
- 字体：系统默认（Figma 设计使用思源黑体）

> **前置要求**: Node ≥ 22.11.0、React Native 开发环境（[配置指南](https://reactnative.dev/docs/set-up-your-environment)）

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd TidyMind
```

### 2. 在 IntelliJ IDEA 中打开

直接用 IDEA 打开项目根目录。IDEA 会自动检测 `package.json` 并弹出提示：

> **"Package requirements are not satisfied. Run 'npm install'?"**

点击 **Run 'npm install'** 即可一键安装所有依赖。

> 如果想更进一步自动化，可以在 `Settings → Languages & Frameworks → Node.js` 中勾选 **`Run 'npm install' automatically`**，之后每次打开项目都会自动安装。

### 3. 启动

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
├── App.tsx                         # 入口 → 导航 + 底部 Tab
├── src/
│   ├── theme/designTokens.ts       # Figma 设计 Token（颜色/字体/圆角/间距）
│   ├── navigation/types.ts         # 路由类型定义
│   ├── state/AppState.tsx          # 全局状态（笔记 + 聊天消息）
│   ├── storage/
│   │   ├── notesStorage.ts         # 笔记本地持久化
│   │   └── chatStorage.ts          # 聊天记录本地持久化
│   ├── types/
│   │   ├── note.ts                 # 笔记数据类型
│   │   └── chat.ts                 # 聊天消息类型
│   ├── screens/
│   │   ├── HomeScreen.tsx          # 首页
│   │   ├── FilesScreen.tsx         # 文件管理
│   │   ├── AssistantScreen.tsx     # AI 助手
│   │   ├── FavoritesScreen.tsx     # 收藏
│   │   ├── ProfileScreen.tsx       # 我的
│   │   ├── ImportScreen.tsx        # 导入
│   │   ├── ExportScreen.tsx        # 导出
│   │   └── SettingsScreen.tsx      # 设置
│   └── components/
│       ├── NoteCard.tsx            # 笔记卡片
│       └── NoteEditorModal.tsx     # 笔记编辑弹窗
├── 作品提交/
│   ├── guideline.md                # 大模型接入指南
│   └── api.md                      # Vivo AIGC API 文档
└── package.json                    # 依赖配置（npm install 全量安装）
```

---

## 故障排查

如果 Metro 报错，尝试：

```bash
npm start -- --reset-cache
```

Android 构建问题：

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

更多信息参考 [React Native 故障排查](https://reactnative.dev/docs/troubleshooting)。
