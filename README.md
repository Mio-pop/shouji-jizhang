# 随手记账 · 纸账本

一个只有纸和笔的记账 App。说一句话或贴一张账单截图，它替你把每一笔落到纸上。

- 无账号、无云同步、无广告，数据只存在本机
- 智能解析：一句话拆成多笔，金额 / 分类 / 日期自动填
- 截图识别：读取微信、支付宝账单截图，自动过滤「消息数」「合计」等噪音
- 统计筛选：按日期区间、分类、收 / 支筛选并实时汇总
- 纸账本皮肤：横格纸、双线合计、朱红页边与印章，配套数字滚动、方向转场、落章与撕纸删除

## 技术栈

Vue 3 + TypeScript + Vite + Vant 4 + Pinia，Capacitor 7 打包 Android。

## 目录

```
src/                 # 页面、组件、store、解析与 OCR
  views/             # 首页 / 解析 / 记账 / 统计 / 我的
  components/        # 数字滚动、保存落章、空状态等
  utils/parse.ts     # 文本解析（多条记录、商户行关联、噪音过滤）
  utils/ocr.ts       # 原生 ML Kit / Web tesseract 双通道
android/             # Capacitor Android 工程
docs/                # GitHub Pages 下载页（含发布的 APK）
```

## 本地开发

```bash
npm install
npm run dev                    # 简约版
VITE_MOTION=fancy npm run dev  # 纸账本版（Linux/macOS）
```

Windows PowerShell：

```powershell
$env:VITE_MOTION='fancy'; npm run dev
```

## 打包

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

两个版本包名不同（`com.mio.ledger.fancy` / `com.mio.ledger`），可以同时安装。

### 签名

签名文件与密码不随仓库分发。在 `android/signing.properties` 里提供：

```properties
storeFile=release.jks
storePassword=你的密码
keyAlias=你的别名
keyPassword=你的密码
```

`release.jks` 放在 `android/app/` 下，两者都已被 `.gitignore` 忽略。**请务必备份 keystore**，同一包名的后续版本必须使用同一签名。

## 发布页

`docs/` 是纯静态下载页，GitHub Pages 选择 `main` 分支的 `/docs` 目录即可：

```
docs/index.html
docs/assets/icon.png
docs/downloads/ledger-fancy-1.2.apk
```

页面里的下载链接指向 `docs/downloads/` 下的 APK，重新打包后覆盖同名文件即可。

## 数据

所有记录保存在 WebView 的 localStorage 中，卸载应用会清空，不做任何上传。
