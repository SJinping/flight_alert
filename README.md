# 牛马特种兵旅游专线机票价格监控系统

一个用于监控特定航线机票价格的自动化工具，支持国内航线价格监控和提醒功能。

使用携程的特价机票查询接口。

仅查询牛马专线（价格低、周四或周五出发）。


## 功能特点

- 支持多目的地机票价格监控
- 支持往返航班查询
- 价格低于目标价格时自动推送提醒
- 提供价格历史记录查看
- 支持日历视图和表格视图
- 支持按城市和价格范围筛选


## 环境要求

- Python 3.7+
- Node.js 14+
- React 18+

## 使用说明

1. 启动价格监控
```bash
python flight_alert.py
```

2. 启动前端界面
```bash
cd display
npm start
```

## 安装步骤

1. 克隆仓库
```bash
git clone <repository-url>
cd flight_alert
```

2. 安装前端依赖
```bash
cd display
npm install
```

3. 访问 http://localhost:3000 查看价格监控界面

## 配置说明
在 config.json 中配置：
- placeFrom : 出发城市代码
- placeTo : 目的地城市代码
- targetPrice : 目标价格
- flightWay : 航班类型（单程/往返）

## 推送通知
本项目使用 PushPlus 进行价格提醒推送，需要在环境变量中配置 PUSH_TOKEN 。