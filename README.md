# TPD-03 智能剂量管理 Web APP

面向 TPD-03 个人剂量仪的 Web APP / 手机界面模拟器，用于展示：

- 手机状态栏：时间、5G、信号、Wi-Fi、电量
- 实时剂量率 RD
- 累计剂量 AcDo
- 最近监测记录
- 实时趋势曲线
- 周报主页推送与周报详情
- TPD-03 HTTP 通讯协议报文模拟/解析

## GitHub Pages

本仓库根目录的 `index.html` 为手机展示入口，`app.html` 为内部 APP 页面。

Pages 发布设置：

- Branch: `main`
- Folder: `/ (root)`

发布后访问：

`https://ktimxfgit.github.io/UserApp/`

## 文件结构

```text
.
├── index.html          # GitHub Pages / 手机外框入口
├── app.html            # APP 主页面
├── styles.css          # APP 样式
├── app.js              # APP 交互与协议模拟
├── .nojekyll           # GitHub Pages 静态站点标记
└── backend/
    └── server.py       # 本地真实设备 HTTP 接收服务（Pages 不执行 Python）
```

## 本地运行真实设备接收服务

GitHub Pages 只提供静态网页，不能直接运行 `server.py`。需要接入真实 TPD-03 设备时，在局域网电脑上运行：

```bash
python backend/server.py
```

真实设备通过 HTTP POST 上报到本地服务；纯 GitHub Pages 演示使用浏览器内置模拟数据和协议解析功能。
