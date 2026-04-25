@echo off
setlocal

cd /d "%~dp0"

echo Starting Python service on port 8000...
start "Python Service" cmd /k "cd /d python_service && uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Node.js server on port 5000...
start "Node Server" cmd /k "cd /d server && npm run dev"

echo Services started:
echo - Python: http://localhost:8000
echo - Node:   http://localhost:5000
