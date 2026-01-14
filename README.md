# 🎯 Backend Engineer Interview Challenge

> **重要说明**: 本项目是一个技术面试挑战，用于评估候选人对复杂 monorepo、AWS 本地开发、NestJS 和事件驱动架构的理解能力。

## 📋 项目概述

这是一个简化的订单处理系统，采用事件驱动架构：

```
┌─────────────────┐    EventBridge    ┌─────────────────┐    SQS    ┌─────────────────┐
│   API Gateway   │ ─────────────────►│   Event Bus     │ ────────►│  Order Worker   │
│   (NestJS)      │    OrderCreated   │                 │          │  (SQS Poller)   │
│   Port: 3000    │                   │                 │          │                 │
└─────────────────┘                   └─────────────────┘          └─────────────────┘
        │                                                                  │
        │                                                                  │
        ▼                                                                  ▼
┌─────────────────┐                                            ┌─────────────────┐
│    DynamoDB     │◄───────────────────────────────────────────│    DynamoDB     │
│    (orders)     │        Update order status                 │    (orders)     │
└─────────────────┘                                            └─────────────────┘
```

## 🏗️ 技术栈

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3+
- **Framework**: NestJS 10
- **AWS Services**: EventBridge, SQS, DynamoDB
- **Local Development**: LocalStack (Docker)
- **Package Manager**: npm (workspaces)

## 📁 项目结构

```
backend-interview-challenge/
├── apps/
│   ├── api-gateway/           # REST API 服务 (NestJS)
│   │   └── src/
│   │       ├── health/        # 健康检查模块
│   │       ├── orders/        # 订单模块
│   │       └── shared/        # 共享服务 (EventBridge, DynamoDB)
│   └── order-worker/          # 订单处理 Worker
│       └── src/
│           ├── processors/    # 消息处理器
│           └── utils/         # 工具类
├── packages/
│   └── shared-contracts/      # 共享类型和接口
├── scripts/
│   ├── local-all.sh          # 本地开发启动脚本
│   └── localstack-setup.sh   # LocalStack 资源初始化
├── docker-compose.yml         # LocalStack 配置
└── package.json               # Monorepo 根配置
```

## 🚀 快速开始

### 前置要求

1. **Node.js 20+** - 使用 nvm: `nvm use`
2. **Docker** - 用于运行 LocalStack
3. **AWS CLI** - 用于初始化 LocalStack 资源
   ```bash
   brew install awscli
   aws configure  # 可以使用任意值，只要有配置即可
   ```

### 安装依赖

```bash
npm install
```

### 启动本地开发环境

```bash
npm run local
```

这将：
1. 检查依赖（Docker, AWS CLI, Node.js）
2. 清理旧进程
3. 启动 LocalStack (Docker)
4. 初始化 AWS 资源（EventBridge, SQS, DynamoDB）
5. 启动 API Gateway (http://localhost:3000)
6. 启动 Order Worker

### 验证服务

```bash
# 健康检查
curl http://localhost:3000/health

# 创建订单
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "cust-123",
    "items": [{
      "productId": "prod-1",
      "productName": "Test Product",
      "quantity": 2,
      "unitPrice": 29.99
    }],
    "totalAmount": 59.98
  }'

# 查看订单
curl http://localhost:3000/api/orders
```

### 查看日志

```bash
# 查看所有日志
tail -f logs/*.log

# 仅查看 API 日志
tail -f logs/api-gateway.log

# 仅查看 Worker 日志
tail -f logs/order-worker.log
```

## 📝 消息流说明

1. **创建订单**: `POST /api/orders` 
   - 保存订单到 DynamoDB (状态: PENDING)
   - 发布 `OrderCreated` 事件到 EventBridge

2. **事件路由**: EventBridge 规则将 `OrderCreated` 事件路由到 SQS 队列

3. **处理订单**: Order Worker 从 SQS 接收消息
   - 更新订单状态为 PROCESSING
   - 模拟处理逻辑
   - 更新订单状态为 COMPLETED

---

# 📋 面试任务

## 第一部分：环境搭建与理解（约1小时）

### 任务 1.1：启动环境
1. 按照上述说明启动本地开发环境
2. 记录你遇到的任何问题和解决方法
3. 确保所有服务都正常运行

### 任务 1.2：架构理解
回答以下问题（可以写在单独的 markdown 文件中）：

1. 画出系统架构图，标注各组件之间的通信方式
2. 解释 LocalStack 在本地开发中的作用
3. 描述从 API 调用到 Worker 处理的完整消息流
4. `scripts/local-all.sh` 脚本做了哪些事情？
5. 如果 Worker 处理消息失败，消息会怎样？

---

## 第二部分：Feature 开发（约2-3小时）

### 任务 2.1：添加通知 Worker

创建一个新的 `notification-worker` 服务，用于处理订单通知：

**要求：**

1. 在 `apps/` 下创建 `notification-worker` 目录
2. 监听 `{stage}-notification-queue` SQS 队列
3. 处理 `NotificationRequested` 事件
4. 将通知记录保存到 DynamoDB 的 `notifications` 表
5. 更新 `scripts/localstack-setup.sh` 创建必要的资源
6. 更新 `scripts/local-all.sh` 启动这个 worker

**提示：**
- 参考 `order-worker` 的实现
- 使用 `packages/shared-contracts` 定义共享类型

### 任务 2.2：添加通知 API

在 `api-gateway` 中添加通知功能：

**要求：**

1. 创建 `POST /api/notifications` 端点
2. 请求体包含: `{ orderId, message, channel: 'EMAIL' | 'SMS' | 'PUSH' }`
3. 发布 `NotificationRequested` 事件到 EventBridge
4. 使用 class-validator 验证请求体
5. 添加 `GET /api/notifications/:notificationId` 端点查询通知状态

### 任务 2.3：完善共享类型

更新 `packages/shared-contracts` 添加：
1. `Notification` 接口
2. `NotificationSentEvent` 事件类型

---

## 第三部分：Debug 挑战（约1小时）

> **注意**: 在完成第一部分和第二部分后，面试官会提供一个包含故意引入问题的代码分支。

你需要找出并修复以下类型的问题：
1. 端口冲突问题
2. SQS 消息格式错误
3. Worker 异常退出问题

请记录：
- 你是如何发现问题的
- 问题的根本原因
- 你的解决方案

---

## 📊 评分标准

| 维度 | 分数 | 评分标准 |
|------|------|---------|
| 环境搭建 | 20分 | 能独立启动环境，解决依赖问题 |
| 架构理解 | 20分 | 清晰解释消息流、服务关系 |
| 代码质量 | 25分 | TypeScript 规范、NestJS 最佳实践、错误处理 |
| 脚本修改 | 15分 | 正确修改 shell 脚本、理解进程管理 |
| Debug 能力 | 20分 | 日志分析、问题定位、解决方案 |

## 🎯 加分项

- 添加单元测试
- 实现优雅的错误处理和重试机制
- 添加健康检查到新的 worker
- 使用 TypeScript 严格模式
- 代码注释清晰

---

## ❓ 常见问题

**Q: LocalStack 启动失败？**
A: 确保 Docker 正在运行，检查端口 4566 是否被占用

**Q: npm install 失败？**
A: 确保使用 Node.js 20+，尝试删除 node_modules 和 package-lock.json 重新安装

**Q: Worker 收不到消息？**
A: 检查 EventBridge 规则是否正确配置，查看 LocalStack 日志

---

祝你好运！ 🚀
