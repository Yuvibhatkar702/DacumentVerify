# Deployment Guide

## Recommended Setup

- Frontend: Vercel
- Node API: Render Web Service
- Python OCR/QR Service: Render Web Service (Docker)
- Database: MongoDB Atlas

## Option A: One-Click Render Blueprint (All 3 Services)

1. Push this repo to GitHub.
2. In Render, choose "New +" -> "Blueprint".
3. Select your repository. Render reads [render.yaml](render.yaml).
4. Set required secret env vars when prompted:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLIENT_URL`
   - `REACT_APP_API_URL` (set to your Render API URL, e.g. `https://docverify-api.onrender.com/api`)
5. Deploy.

Note:
- The blueprint is configured for free plans where supported.
- If Render still requests card details, it is an account-level policy and cannot be bypassed from project config.

## Option B: Vercel Frontend + Render APIs (Recommended)

### 1) Deploy Python service on Render

- Create a new Web Service in Render from this repo.
- Root directory: `python_service`
- Environment: `Docker`
- Dockerfile: [python_service/Dockerfile](python_service/Dockerfile)
- Health check path: `/health`
- Port: `8000`

### 2) Deploy Node API on Render

- Create a new Web Service in Render from this repo.
- Root directory: `server`
- Environment: `Node`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Add env vars:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `MONGODB_URI=<your_atlas_uri>`
  - `JWT_SECRET=<your_secret>`
  - `JWT_EXPIRE=7d`
  - `CLIENT_URL=<your_vercel_frontend_url>`
  - `PYTHON_SERVICE_URL=<your_render_python_service_url>`

### 3) Deploy client on Vercel

- Import repo into Vercel.
- Root directory: `client`
- Framework preset: `Create React App`
- Build command: `npm run build`
- Output directory: `build`
- Environment variable:
  - `REACT_APP_API_URL=<your_render_node_api_url>/api`
- SPA rewrite config is already added in [client/vercel.json](client/vercel.json).

## Post-Deploy Verification

1. Open API health endpoint: `<node_api_url>/api/health`
2. Open Python health endpoint: `<python_service_url>/health`
3. In Node logs, ensure Python fallback errors are not continuous.
4. Upload an Aadhaar image from UI and verify OCR + QR fields return.

## Notes

- Python OCR relies on Tesseract + ZBar system packages, included in [python_service/Dockerfile](python_service/Dockerfile).
- Keep `PYTHON_SERVICE_URL` in Node set to the deployed Python URL.
- If Python is unavailable, Node automatically falls back to existing JS QR/OCR methods.
