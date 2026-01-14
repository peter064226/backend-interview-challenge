#!/usr/bin/env bash
set -euo pipefail

# 🐛 Create Debug Challenge Branch
# This script creates a version with intentional bugs for the debug challenge

echo "🐛 Creating debug challenge files..."
echo ""

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Bug 1: Port conflict in local-all.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cat > "$PROJECT_ROOT/scripts/local-all-buggy.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"
STAGE=${STAGE:-local}
export STAGE

echo "🚀 Starting services..."

# Start LocalStack
docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d

# Wait for LocalStack
sleep 5
bash "$PROJECT_ROOT/scripts/localstack-setup.sh"

# BUG: Both services trying to use port 3000!
export PORT=3000

echo "Starting API Gateway on port $PORT..."
(cd "$PROJECT_ROOT/apps/api-gateway" && npm run start:dev 2>&1 | tee "$LOGS_DIR/api-gateway.log") &

sleep 3

# BUG: Worker also set to port 3000 (should not have PORT set at all)
echo "Starting Order Worker on port $PORT..."
export PORT=3000  # This is wrong - worker doesn't need a port
(cd "$PROJECT_ROOT/apps/order-worker" && npm run dev 2>&1 | tee "$LOGS_DIR/order-worker.log") &

wait
EOF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Bug 2: Wrong JSON serialization in EventBridge
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cat > "$PROJECT_ROOT/apps/api-gateway/src/shared/eventbridge/eventbridge.service.buggy.ts" << 'EOF'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';

export interface EventPayload {
  source: string;
  detailType: string;
  detail: Record<string, unknown>;
}

@Injectable()
export class EventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EventBridgeService.name);
  private client: EventBridgeClient;
  private readonly eventBusName: string;

  constructor() {
    const stage = process.env.STAGE ?? 'local';
    this.eventBusName = process.env.EVENT_BUS_NAME ?? `${stage}.interview.eventbus`;

    const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
    const isLocal = stage === 'local' || endpoint.includes('localhost');

    this.client = new EventBridgeClient({
      region: process.env.AWS_REGION ?? 'us-west-2',
      ...(isLocal && {
        endpoint,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    });
  }

  onModuleInit(): void {
    this.logger.log(`📡 EventBridge connected to bus: ${this.eventBusName}`);
  }

  async publishEvent(payload: EventPayload): Promise<void> {
    const entry: PutEventsRequestEntry = {
      EventBusName: this.eventBusName,
      Source: payload.source,
      DetailType: payload.detailType,
      // BUG: Missing JSON.stringify! Detail must be a JSON string, not an object
      Detail: payload.detail as unknown as string,  // This is WRONG
    };

    const command = new PutEventsCommand({ Entries: [entry] });

    try {
      const result = await this.client.send(command);
      this.logger.log(`✅ Event published: ${payload.detailType}`);
    } catch (error) {
      this.logger.error(`❌ Failed to publish event`, error);
      throw error;
    }
  }
}
EOF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Bug 3: Unhandled exception in processor
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cat > "$PROJECT_ROOT/apps/order-worker/src/processors/order.processor.buggy.ts" << 'EOF'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '../utils/logger';
import { MessageProcessor } from './processor.interface';

const ORDERS_TABLE = 'orders';

export class OrderProcessor implements MessageProcessor {
  private readonly logger = new Logger('OrderProcessor');
  private readonly docClient: DynamoDBDocumentClient;

  constructor() {
    const stage = process.env.STAGE ?? 'local';
    const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
    const isLocal = stage === 'local' || endpoint.includes('localhost');

    const client = new DynamoDBClient({
      region: process.env.AWS_REGION ?? 'us-west-2',
      ...(isLocal && {
        endpoint,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    });

    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async process(payload: Record<string, unknown>): Promise<void> {
    const orderId = payload.orderId as string;

    // BUG: Throws unhandled exception that crashes the entire worker!
    // Should be caught and logged instead
    if (!orderId) {
      throw new Error('FATAL: Missing orderId in payload - this will crash the worker!');
    }

    // BUG: Also crashes if customerId is missing
    const customerId = payload.customerId as string;
    if (!customerId) {
      throw new Error('FATAL: Missing customerId in payload!');
    }

    this.logger.log(`📦 Processing order: ${orderId}`);
    
    await this.updateOrderStatus(orderId, 'PROCESSING');
    await this.simulateProcessing();
    await this.updateOrderStatus(orderId, 'COMPLETED');

    this.logger.log(`✅ Order processed: ${orderId}`);
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { orderId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      },
    });

    await this.docClient.send(command);
  }

  private async simulateProcessing(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
EOF

chmod +x "$PROJECT_ROOT/scripts/local-all-buggy.sh"

echo "✅ Debug challenge files created:"
echo "   - scripts/local-all-buggy.sh (Port conflict bug)"
echo "   - apps/api-gateway/src/shared/eventbridge/eventbridge.service.buggy.ts (JSON bug)"
echo "   - apps/order-worker/src/processors/order.processor.buggy.ts (Exception bug)"
echo ""
echo "📝 To use for interview:"
echo "   1. Create a new branch: git checkout -b debug-challenge"
echo "   2. Replace the original files with buggy versions"
echo "   3. Commit and share with candidate"
