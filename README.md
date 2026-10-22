# 随手记账 · 纸账本

> 一个只有纸和笔的记账 App。说一句话或贴一张账单截图，它替你把每一笔落到纸上。

[![Vue](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vant](https://img.shields.io/badge/Vant-4-1989fa?style=flat-square)](https://vant-ui.github.io/vant/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7-53b9ff?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Platform](https://img.shields.io/badge/Android-7.0%2B-3ddc84?style=flat-square&logo=android&logoColor=white)](#下载)

[下载 APK](#下载) · [功能](#功能) · [本地运行](#本地运行) · [构建](#构建) · [签名](#签名配置) · [路线图](#路线图)

---

## 下载

| 版本 | 说明 | 大小 | 包名 |
| --- | --- | --- | --- |
| **纸账本版 v1.1** | 推荐，含完整皮肤与动效 | 46.9 MB | `com.mio.ledger.fancy` |

直链下载（无需登录）：

```
https://github.com/Mio-pop/shouji-jizhang/raw/main/docs/downloads/ledger-fancy-1.1.apk
```

安装：下载后在文件管理器中打开 → 允许「安装未知应用」→ 安装。系统要求 Android 7.0（API 24）及以上。

> 数据保存在本机，卸载会清空。目前未提供导出/备份功能。

## 功能

- **手动记账**：金额、分类、备注、日期可改；支持事后编辑与左滑删除
- **文本解析**：一句话拆成多笔（「午饭 28，晚上打车 15」→ 两条），自动判断金额、分类、日期、收支
- **截图识别**：读取微信 / 支付宝账单截图，多笔分行提取；原生 ML Kit 与 Web tesseract 双通道
- **噪音过滤**：忽略「6 条新消息」「合计」「账单详情」等非交易行，并清理 OCR 带入的杂字符
- **商户关联**：支持「商户名与金额分两行」的账单版式，商户名自动成为备注并参与分类
- **统计筛选**：按日期区间 / 分类 / 收支筛选，实时汇总笔数与合计
- **纸账本皮肤**：横格纸、双线合计、朱红页边与印章；数字滚动、方向型转场、落章、撕纸删除
- **本地优先**：无账号、无云同步、无广告，断网可用

## 技术栈

| 层 | 选择 |
| --- | --- |
| 框架 | Vue 3（`<script setup>` + Composition API） |
| 语言 | TypeScript |
| 构建 | Vite |
| UI | Vant 4 |
| 状态 | Pinia |
| 打包 | Capacitor 7（Android） |
| OCR | `@capacitor-mlkit/text-recognition`（原生）/ `tesseract.js`（Web 兜底） |

## 本地运行

```bash
git clone git@github.com:Mio-pop/shouji-jizhang.git
cd shouji-jizhang
npm install
```

启动简约版（浅色界面，无皮肤）：

```bash
npm run dev
```

启动纸账本版：

```bash
# macOS / Linux
VITE_MOTION=fancy npm run dev

# Windows PowerShell
$env:VITE_MOTION='fancy'; npm run dev
```

浏览器预览时，OCR 走 Web 通道（tesseract）；真机安装后自动切换到原生 ML Kit。

## 构建

```bash
# 纸账本版
VITE_MOTION=fancy npm run build
npx cap sync android
cd android && ./gradlew assembleRelease -Pflavor=fancy

# 简约版
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease -Pflavor=simple
```

产物路径：`android/app/build/outputs/apk/release/app-release.apk`

两个版本包名不同（`com.mio.ledger.fancy` / `com.mio.ledger`），可同时安装，但数据互不相通。

Windows 下如果 `./gradlew` 不可用，改用 `.\gradlew.bat`。

## 签名配置

仓库**不包含**签名文件与密码。自行构建 release 包时：

1. 生成 keystore（放在 `android/app/` 下）：

```bash
keytool -genkeypair -v \
  -keystore android/app/release.jks \
  -alias ledger \
  -keyalg RSA -keysize 2048 -validity 10000
```

2. 在 `android/signing.properties` 写入（该文件已被 `.gitignore` 忽略）：

```properties
storeFile=release.jks
storePassword=你的_store_密码
keyAlias=ledger
keyPassword=你的_key_密码
```

3. 构建脚本会自动读取该文件：

```gradle
storeFile file(signingProps.getProperty('storeFile', 'release.jks'))
storePassword signingProps.getProperty('storePassword')
keyAlias signingProps.getProperty('keyAlias')
keyPassword signingProps.getProperty('keyPassword')
```

> **务必自行备份 keystore 与密码。** 同一包名的后续版本必须使用同一签名，否则已安装用户无法覆盖升级。
> 没有签名文件时 `assembleRelease` 会失败，可先用 `assembleDebug` 做功能验证。

## 目录结构

```
src/
├── views/                  # 首页 / 解析 / 记账 / 统计 / 我的
├── components/             # RollNumber 数字滚动、BurstEffect 落章、EmptyState 空状态、RecordEditSheet
├── stores/records.ts       # 记录、统计、持久化（localStorage）
├── utils/parse.ts          # 文本解析：多笔拆分、商户关联、噪音过滤
├── utils/ocr.ts            # OCR 双通道封装
├── style.css              # 纸账本主题与动效
└── motion.ts              # 构建级动效开关
android/                    # Capacitor Android 工程
docs/                       # 静态下载页（含发布的 APK）
```

## 版本记录

### v1.1 · 2026.10

- 全新纸账本界面：横格纸、双线合计、朱红页边与印章
- 数字滚动、方向型转场、落章、撕纸删除、输入聚焦线
- 截图识别支持商户名与金额分行的账单，过滤消息角标等噪音
- 最近记录改为按写入顺序展示，补记过去日期也能立刻看到
- 统一应用名为「随手记账」，图标与启动图改为纸账本风格

### v1.0

- 手动记账、统计筛选、左滑删除
- 文本解析与截图 OCR，确认后批量入账
- 本地存储，无账号体系

## 已知限制

- 数据仅存于 WebView 的 localStorage，清数据或卸载即丢失，暂无导出/备份
- OCR 的文本行顺序取决于识别引擎，个别账单版式可能关联不到商户名（金额不受影响）
- 暂未上架应用商店，无自动更新
- 无后端，多设备之间不同步

## 路线图

- [ ] 记账搭子：基于本地统计的个性化点评（离线、不联网）
- [ ] 数据导出 / 导入（JSON 备份）
- [ ] 对话式记账（云端模型，金额只取用户原文）
- [ ] 读取支付通知（需通知使用权，单独开关）

## 说明

- 本项目为个人作品，目前未指定开源协议；如需转载或二次分发请先联系作者。
- 仓库中不包含任何密钥、签名文件或用户数据。

## 反馈

有问题或建议，欢迎提 [Issue](https://github.com/Mio-pop/shouji-jizhang/issues)。
