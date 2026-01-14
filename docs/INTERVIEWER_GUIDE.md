# 📋 面试官评估指南

> **内部文档**：本文档仅供面试官使用，不应分享给候选人

## 🎯 评估目标

本面试挑战旨在评估以下能力：

1. **复杂项目上手能力** - 能否快速理解 monorepo 结构和本地开发环境
2. **AWS 服务理解** - EventBridge、SQS、DynamoDB 的使用
3. **NestJS 开发能力** - 模块化架构、依赖注入、验证
4. **Shell 脚本能力** - 理解和修改启动脚本
5. **问题解决能力** - 日志分析、调试、根因分析

## 📊 详细评分表

### 第一部分：环境搭建与理解（40分）

#### 任务 1.1：启动环境（20分）

| 表现 | 分数 | 描述 |
|------|------|------|
| 优秀 | 18-20 | 快速启动，主动解决问题，记录清晰 |
| 良好 | 14-17 | 能独立启动，解决基本问题 |
| 合格 | 10-13 | 需要一些提示，但最终能启动 |
| 不合格 | 0-9 | 无法启动或需要大量帮助 |

**观察要点：**
- 是否先阅读 README
- 遇到问题时的解决思路
- 是否检查 Docker 状态
- 是否理解 npm workspaces

#### 任务 1.2：架构理解（20分）

**期望答案：**

1. **架构图**（5分）
   - 正确识别所有组件
   - 标注通信协议（HTTP、EventBridge、SQS）
   - 显示数据流方向

2. **LocalStack 作用**（3分）
   ```
   LocalStack 模拟 AWS 服务，允许在本地开发和测试，无需：
   - 连接真实 AWS 账号
   - 产生 AWS 费用
   - 处理网络延迟
   ```

3. **消息流描述**（5分）
   ```
   1. 客户端 POST /api/orders
   2. API Gateway 保存订单到 DynamoDB
   3. API Gateway 发布 OrderCreated 事件到 EventBridge
   4. EventBridge 规则匹配事件，路由到 SQS 队列
   5. Order Worker 轮询 SQS 获取消息
   6. Worker 处理消息，更新 DynamoDB 中的订单状态
   7. Worker 删除已处理的 SQS 消息
   ```

4. **local-all.sh 分析**（4分）
   - 检查依赖（Docker, AWS CLI, Node.js）
   - 清理旧进程
   - 启动 LocalStack
   - 初始化 AWS 资源
   - 启动 API 和 Worker

5. **消息失败处理**（3分）
   ```
   - 消息不会被删除
   - 可见性超时后重新出现在队列中
   - 可以被重新处理（死信队列如果配置了）
   ```

---

### 第二部分：Feature 开发（40分）

#### 任务 2.1：添加 Notification Worker（15分）

**期望实现：**

```
apps/notification-worker/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── sqs-poller.ts
    ├── processors/
    │   ├── processor.interface.ts
    │   └── notification.processor.ts
    └── utils/
        └── logger.ts
```

**评分要点：**

| 要素 | 分数 | 描述 |
|------|------|------|
| 项目结构正确 | 3 | 遵循现有 worker 的结构 |
| SQS 轮询实现 | 4 | 正确处理消息接收和删除 |
| DynamoDB 操作 | 3 | 正确保存通知记录 |
| 错误处理 | 3 | 适当的错误捕获和日志 |
| 脚本更新 | 2 | 正确更新 localstack-setup.sh 和 local-all.sh |

**常见错误：**
- 忘记在 localstack-setup.sh 中创建队列
- 忘记在 local-all.sh 中启动 worker
- 消息处理后忘记删除
- DynamoDB 表名不一致

#### 任务 2.2：添加通知 API（15分）

**期望实现：**

```typescript
// notifications.controller.ts
@Controller('api/notifications')
export class NotificationsController {
  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) { ... }
  
  @Get(':notificationId')
  async getNotification(@Param('notificationId') id: string) { ... }
}

// create-notification.dto.ts
export class CreateNotificationDto {
  @IsString()
  orderId: string;
  
  @IsString()
  message: string;
  
  @IsIn(['EMAIL', 'SMS', 'PUSH'])
  channel: 'EMAIL' | 'SMS' | 'PUSH';
}
```

**评分要点：**

| 要素 | 分数 | 描述 |
|------|------|------|
| Controller 正确 | 4 | 正确的路由和方法 |
| DTO 验证 | 4 | 使用 class-validator |
| EventBridge 发布 | 4 | 正确发布事件 |
| DynamoDB 操作 | 3 | 正确保存和查询 |

#### 任务 2.3：共享类型（10分）

**期望实现：**

```typescript
// packages/shared-contracts/src/notifications.ts
export interface Notification {
  notificationId: string;
  orderId: string;
  message: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: string;
  sentAt?: string;
}

// packages/shared-contracts/src/events.ts
export interface NotificationSentEvent extends BaseEvent {
  eventType: 'NotificationSent';
  payload: {
    notificationId: string;
    orderId: string;
    channel: 'EMAIL' | 'SMS' | 'PUSH';
    sentAt: string;
  };
}
```

---

### 第三部分：Debug 挑战（20分）

#### 预埋的问题

在发给候选人的 debug 分支中，我们故意引入以下问题：

**问题 1：端口冲突（6分）**
```bash
# local-all.sh 中故意启动两个服务使用同一端口
export PORT=3000  # API Gateway
export PORT=3000  # 故意让 Worker 也尝试使用 3000
```

**期望解决：**
- 识别端口冲突错误
- 修改环境变量或配置

**问题 2：SQS 消息格式错误（7分）**
```typescript
// eventbridge.service.ts 中故意使用错误的 JSON 序列化
Detail: payload.detail,  // 应该是 JSON.stringify(payload.detail)
```

**期望解决：**
- 通过日志发现消息解析失败
- 定位到 EventBridge 发布代码
- 添加正确的 JSON.stringify

**问题 3：Worker 异常退出（7分）**
```typescript
// order.processor.ts 中添加未捕获的异常
async process(payload: Record<string, unknown>): Promise<void> {
  if (!payload.orderId) {
    throw new Error('Missing orderId');  // 未捕获，导致进程退出
  }
}
```

**期望解决：**
- 发现 Worker 进程退出
- 添加 try-catch 或在 SQS poller 中处理异常
- 确保单个消息失败不会导致整个 worker 退出

**评分要点：**

| 要素 | 分数 | 描述 |
|------|------|------|
| 问题发现方法 | 6 | 有效的调试策略（日志、curl 测试等） |
| 根因分析 | 7 | 准确识别问题根源 |
| 解决方案质量 | 7 | 解决方案合理且不引入新问题 |

---

## 🚩 红旗信号

以下行为应该引起警惕：

1. **不阅读文档直接开始** - 可能缺乏耐心或习惯
2. **遇到问题立即求助** - 可能缺乏独立解决问题的能力
3. **不理解 npm workspaces** - 可能缺乏 monorepo 经验
4. **硬编码配置** - 不理解环境变量的重要性
5. **不写错误处理** - 可能导致生产问题
6. **不测试代码** - 可能缺乏质量意识

## ✅ 加分行为

以下行为应该加分：

1. **主动添加测试** - 表明质量意识
2. **优雅的错误处理** - 考虑边界情况
3. **清晰的代码注释** - 良好的沟通习惯
4. **提问好问题** - 表明深入思考
5. **考虑扩展性** - 架构思维

## 💬 面试后问题

完成任务后，可以问以下问题深入了解候选人：

1. "如果这个系统每天处理100万订单，你会如何优化？"
2. "你会如何添加监控和告警？"
3. "如果消息处理需要幂等性，你会怎么实现？"
4. "你会如何处理部署？CI/CD 流程是什么？"
5. "如果要添加一个新的 Worker，需要修改哪些地方？"

---

## 📝 最终评分

| 部分 | 满分 | 实际得分 |
|------|------|----------|
| 环境搭建与理解 | 40 | |
| Feature 开发 | 40 | |
| Debug 挑战 | 20 | |
| **总分** | **100** | |

### 评级标准

- **90-100**: 强烈推荐
- **75-89**: 推荐
- **60-74**: 有保留地推荐
- **40-59**: 不推荐
- **0-39**: 强烈不推荐

---

*最后更新: 2026-01-14*
