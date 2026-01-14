#!/usr/bin/env bash
set -euo pipefail

# 📡 LocalStack Resource Setup Script
# Creates SQS queues, DynamoDB tables, and EventBridge rules

STAGE=${STAGE:-local}
AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-000000000000}"

echo "📡 Setting up LocalStack resources..."
echo "   Stage: $STAGE"
echo "   Endpoint: $AWS_ENDPOINT_URL"
echo "   Region: $AWS_REGION"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Create EventBridge Event Bus
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT_BUS_NAME="${STAGE}.interview.eventbus"
echo "📌 Creating EventBridge event bus: $EVENT_BUS_NAME"
set +e
aws --endpoint-url "$AWS_ENDPOINT_URL" events create-event-bus \
  --name "$EVENT_BUS_NAME" \
  --region "$AWS_REGION" >/dev/null 2>&1
set -e
echo "   ✅ Event bus ready"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Create SQS Queues
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER_QUEUE_NAME="${STAGE}-order-processing-queue"
echo "📌 Creating SQS queue: $ORDER_QUEUE_NAME"
set +e
aws --endpoint-url "$AWS_ENDPOINT_URL" sqs create-queue \
  --queue-name "$ORDER_QUEUE_NAME" \
  --region "$AWS_REGION" >/dev/null 2>&1
set -e
ORDER_QUEUE_URL=$(aws --endpoint-url "$AWS_ENDPOINT_URL" sqs get-queue-url \
  --queue-name "$ORDER_QUEUE_NAME" \
  --query 'QueueUrl' --output text)
ORDER_QUEUE_ARN="arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${ORDER_QUEUE_NAME}"
echo "   ✅ Queue ready: $ORDER_QUEUE_URL"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Create DynamoDB Tables
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "📌 Creating DynamoDB table: orders"
set +e
aws --endpoint-url "$AWS_ENDPOINT_URL" dynamodb create-table \
  --table-name orders \
  --attribute-definitions AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=orderId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION" >/dev/null 2>&1
set -e
echo "   ✅ Table 'orders' ready"

echo "📌 Creating DynamoDB table: processed-orders"
set +e
aws --endpoint-url "$AWS_ENDPOINT_URL" dynamodb create-table \
  --table-name processed-orders \
  --attribute-definitions AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=orderId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION" >/dev/null 2>&1
set -e
echo "   ✅ Table 'processed-orders' ready"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Create EventBridge Rules
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER_RULE_NAME="${STAGE}-order-created-rule"
echo "📌 Creating EventBridge rule: $ORDER_RULE_NAME"
set +e
aws --endpoint-url "$AWS_ENDPOINT_URL" events put-rule \
  --name "$ORDER_RULE_NAME" \
  --event-bus-name "$EVENT_BUS_NAME" \
  --event-pattern '{"source":["orders.service"],"detail-type":["OrderCreated"]}' \
  --state ENABLED \
  --region "$AWS_REGION" >/dev/null 2>&1

aws --endpoint-url "$AWS_ENDPOINT_URL" events put-targets \
  --rule "$ORDER_RULE_NAME" \
  --event-bus-name "$EVENT_BUS_NAME" \
  --targets "Id=1,Arn=$ORDER_QUEUE_ARN" \
  --region "$AWS_REGION" >/dev/null 2>&1
set -e
echo "   ✅ Rule ready: OrderCreated → $ORDER_QUEUE_NAME"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ LocalStack resources initialized"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "   EventBridge Bus: $EVENT_BUS_NAME"
echo "   SQS Queue:       $ORDER_QUEUE_NAME"
echo "   DynamoDB Tables: orders, processed-orders"
echo ""
echo "📨 Message Flow:"
echo "   API (OrderCreated) → EventBridge → SQS → Order Worker"
echo ""
