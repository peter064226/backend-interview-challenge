#!/usr/bin/env bash
set -euo pipefail

# 🚀 Backend Interview Challenge - Local Development Script
# Starts all services: LocalStack, API Gateway, and Order Worker

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"
STAGE=${STAGE:-local}
export STAGE

# Colors for output
COLOR_RESET='\033[0m'
COLOR_API='\033[36m'       # Cyan
COLOR_WORKER='\033[35m'    # Magenta
COLOR_NOTIFICATION='\033[34m' # Blue
COLOR_LOCALSTACK='\033[33m' # Yellow
COLOR_SUCCESS='\033[32m'   # Green
COLOR_ERROR='\033[31m'     # Red

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Backend Interview Challenge - Local Development"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ✅ 1. Check dependencies
echo "🔍 [1/6] Checking dependencies..."
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${COLOR_ERROR}❌ Docker is not installed${COLOR_RESET}" >&2
  exit 1
fi
if ! command -v aws >/dev/null 2>&1; then
  echo -e "${COLOR_ERROR}❌ AWS CLI is not installed (brew install awscli)${COLOR_RESET}" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo -e "${COLOR_ERROR}❌ Node.js is not installed${COLOR_RESET}" >&2
  exit 1
fi
echo -e "${COLOR_SUCCESS}✅ All dependencies found${COLOR_RESET}"

# ✅ 2. Clean up old processes
echo ""
echo "🧹 [2/6] Cleaning up old processes..."
set +e
pkill -f "api-gateway.*main.ts" 2>/dev/null
pkill -f "order-worker.*main.ts" 2>/dev/null
pkill -f "notification-worker.*main.ts" 2>/dev/null

# Release common ports
if command -v lsof >/dev/null 2>&1; then
  for PORT in 3000 4566; do
    EXISTING_PID=$(lsof -ti :$PORT || true)
    if [[ -n "$EXISTING_PID" ]]; then
      echo "   🔪 Releasing port $PORT: $EXISTING_PID"
      kill -9 $EXISTING_PID 2>/dev/null || true
    fi
  done
fi
set -e
sleep 2
echo -e "${COLOR_SUCCESS}✅ Cleanup complete${COLOR_RESET}"

# ✅ 3. Clean up old logs
echo ""
echo "🗑️  [3/6] Cleaning up old logs..."
rm -f "$LOGS_DIR/api-gateway.log"
rm -f "$LOGS_DIR/order-worker.log"
rm -f "$LOGS_DIR/notification-worker.log"
echo -e "${COLOR_SUCCESS}✅ Logs cleaned${COLOR_RESET}"

# ✅ 4. Start LocalStack
echo ""
echo "🐳 [4/6] Starting LocalStack..."
cd "$PROJECT_ROOT"
docker compose up -d

# Wait for LocalStack health check
AWS_ENDPOINT_URL="http://localhost:4566"
for i in {1..30}; do
  if curl -fsS "$AWS_ENDPOINT_URL/_localstack/health" >/dev/null 2>&1; then
    echo -e "${COLOR_SUCCESS}✅ LocalStack is ready${COLOR_RESET}"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo -e "${COLOR_ERROR}❌ LocalStack is not ready${COLOR_RESET}" >&2
    exit 1
  fi
done

# ✅ 5. Initialize LocalStack resources
echo ""
echo "📡 [5/6] Initializing LocalStack resources..."
bash "$PROJECT_ROOT/scripts/localstack-setup.sh"
echo -e "${COLOR_SUCCESS}✅ LocalStack resources initialized${COLOR_RESET}"

# ✅ 6. Start services
echo ""
echo "🚀 [6/6] Starting all services..."
echo ""

# Log prefix function
prefix_logs() {
  local color=$1
  local prefix=$2
  while IFS= read -r line; do
    echo -e "${color}[${prefix}]${COLOR_RESET} $line"
  done
}

# Export environment variables for services
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_REGION="us-west-2"
export EVENT_BUS_NAME="${STAGE}.interview.eventbus"

# Start API Gateway
echo "   📦 Starting API Gateway..."
(
  cd "$PROJECT_ROOT/apps/api-gateway"
  npm run start:dev 2>&1 \
    | tee "$LOGS_DIR/api-gateway.log" \
    | prefix_logs "$COLOR_API" "API"
) & PID_API=$!

# Wait for API to start
sleep 5

# Start Order Worker
echo "   🔄 Starting Order Worker..."
(
  cd "$PROJECT_ROOT/apps/order-worker"
  npm run dev 2>&1 \
    | tee "$LOGS_DIR/order-worker.log" \
    | prefix_logs "$COLOR_WORKER" "WORKER"
) & PID_WORKER=$!

# Wait for workers to start
sleep 3

# Start Notification Worker
echo "   📧 Starting Notification Worker..."
(
  cd "$PROJECT_ROOT/apps/notification-worker"
  npm run dev 2>&1 \
    | tee "$LOGS_DIR/notification-worker.log" \
    | prefix_logs "$COLOR_NOTIFICATION" "NOTIFY"
) & PID_NOTIFICATION=$!

# Wait for services to start
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${COLOR_SUCCESS}✅ All services started${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Service Status:"
echo "   🔵 API Gateway            http://localhost:3000 (PID: $PID_API)"
echo "   🔄 Order Worker           Running (PID: $PID_WORKER)"
echo "   📧 Notification Worker    Running (PID: $PID_NOTIFICATION)"
echo "   🟡 LocalStack             http://localhost:4566"
echo ""
echo "📝 Log files:"
echo "   $LOGS_DIR/api-gateway.log"
echo "   $LOGS_DIR/order-worker.log"
echo "   $LOGS_DIR/notification-worker.log"
echo ""
echo "🔍 View logs in real-time:"
echo "   tail -f $LOGS_DIR/*.log"
echo ""
echo "📮 Test API:"
echo "   curl http://localhost:3000/health"
echo "   curl -X POST http://localhost:3000/api/orders -H 'Content-Type: application/json' -d '{\"customerId\":\"cust-123\",\"items\":[{\"productId\":\"prod-1\",\"productName\":\"Test Product\",\"quantity\":2,\"unitPrice\":29.99}],\"totalAmount\":59.98}'"
echo ""
echo "🛑 Stop all services:"
echo "   kill $PID_API $PID_WORKER $PID_NOTIFICATION && docker compose down"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ Services running... (Press Ctrl+C to stop)"

# Graceful exit
cleanup() {
  if [ "${CLEANED_UP:-0}" -eq 1 ]; then
    return
  fi
  CLEANED_UP=1
  echo ""
  echo "🛑 Stopping all services..."
  kill $PID_API $PID_WORKER $PID_NOTIFICATION 2>/dev/null || true
  cd "$PROJECT_ROOT" && docker compose down
}
trap 'cleanup; exit 0' INT TERM
trap cleanup EXIT

# Wait for all processes
wait $PID_API $PID_WORKER $PID_NOTIFICATION
wait
