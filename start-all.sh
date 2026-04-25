#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  if [[ -n "${PY_PID:-}" ]]; then kill "$PY_PID" 2>/dev/null || true; fi
  if [[ -n "${NODE_PID:-}" ]]; then kill "$NODE_PID" 2>/dev/null || true; fi
}

trap cleanup EXIT INT TERM

echo "Starting Python service on port 8000..."
(
  cd "$ROOT_DIR/python_service"
  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
) &
PY_PID=$!

echo "Starting Node.js server on port 5000..."
(
  cd "$ROOT_DIR/server"
  npm run dev
) &
NODE_PID=$!

echo "Services started:"
echo "- Python: http://localhost:8000"
echo "- Node:   http://localhost:5000"

wait "$PY_PID" "$NODE_PID"
