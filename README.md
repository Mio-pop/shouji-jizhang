# 随手记账 · 纸账本

一个只有纸和笔的记账 App。说一句话或贴一张账单截图，它替你把每一笔落到纸上。

- 无账号、无云同步、无广告，数据只存在本机
- 智能解析：一句话拆成多笔，金额 / 分类 / 日期自动填
- 截图识别：读取微信、支付宝账单截图，自动过滤「消息数」「合计」等噪音
- 统计筛选：按日期区间、分类、收 / 支筛选并实时汇总
- 纸账本皮肤：横格纸、双线合计、朱红页边与印章，配套数字滚动、方向转场、落章与撕纸删除
- 记账提醒：每晚 21:00 本地通知，当天已记账则自动取消；点击通知直接进入记账页

## 通知权限

首次启动会申请通知权限，用于每晚 21:00 的记账提醒：

- 使用非精确闹钟（不申请 `SCHEDULE_EXACT_ALARM`），系统可能延后几分钟，属于正常现象
- 当天记过账会自动取消当晚的提醒
- 拒绝通知权限不影响任何记账功能，只是收不到提醒
- 部分国产 ROM 需要允许「自启动」并关闭电池优化，否则提醒可能被系统拦截

## 技术栈

Vue 3 + TypeScript + Vite + Vant 4 + Pinia，Capacitor 8 打包 Android。

## 目录

```
src/                 # 页面、组件、store、解析与 OCR
  views/             # 首页 / 解析 / 记账 / 统计 / 我的
  components/        # 数字滚动、保存落章、空状态等
  utils/parse.ts     # 文本解析（多条记录、商户行关联、噪音过滤）
  utils/ocr.ts       # 原生 ML Kit / Web tesseract 双通道
android/             # Capacitor Android 工程
docs/                # 静态下载页（含发布的 APK）
```

## 本地开发

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`，包名 `com.mio.ledger.fancy`。

## 发布页

`docs/` 是静态下载页，重新打包后覆盖 `docs/downloads/` 下的 APK 即可。

## 数据

所有记录保存在 WebView 的 localStorage 中，卸载应用会清空，不做任何上传。
