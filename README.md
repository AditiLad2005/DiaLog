# DiaLog – Smart Diabetes Meal Analyzer

DiaLog helps people with diabetes make safer food choices. It analyzes meals using machine learning and provides clear, personalized guidance before and after you eat.

## Features

- ✅ Smart Meal Analysis (ML): safety prediction with confidence
- ✅ Truly Personalized Recommendations: adapts to your health profile and historical logs
- ✅ Nutritional Facts: calories, carbs, protein, fats, fiber, GI/GL
- ✅ Real‑time Search: 1,000+ Indian foods with quick filter
- ✅ BMI & Health Insights: basic metrics surfaced in dashboard
- ✅ Risk Assessment Badges: safe / caution / unsafe
- ✅ NEW: Quick Food Safety Checker – check a food before logging it (no side effects on logs)

## Architecture

- Frontend: React 18, Vite/CRA tooling, Tailwind CSS, Heroicons
- Backend: FastAPI, Pydantic, Uvicorn, joblib models
- ML: Random Forest/ensemble models for risk prediction + per‑user models
- Data: Food Master Dataset (nutritional facts), User Logs (for personalization)
- Storage/Cloud (optional): Firebase Admin SDK for Firestore logging

## Prerequisites

- Python 3.10+ (3.8+ supported)
- Node.js 16+ (18+ recommended)
- Git

## Setup & Installation

## Setup & Installation

### Initial Setup (first time only)

#### Backend setup
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment (Windows PowerShell)
./venv/Scripts/Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Optional: Firebase Admin support
npm install
```

#### Frontend setup
```powershell
# Navigate to frontend directory
cd ../frontend

# Install Node.js dependencies
npm install
```

### Quick start (after initial setup)

#### Option 1: Start both servers together
```powershell
# From project root directory
./start_dev.bat
```

#### Option 2: Start servers separately
```powershell
# Backend terminal
cd backend; uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend terminal (new window)
cd frontend; npm start
```

### Access URLs
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000 (or 3001 if 3000 is occupied)
- API Docs (Swagger): http://localhost:8000/docs

## New: Quick Food Safety Checker

Check if a food is Safe / Caution / Unsafe before you eat it – without logging anything.

- UI: Dashboard → “Quick Food Safety Check” panel
- Flow: type to search → pick a food → click “Check Safety”
- Backend: uses `/food/{name}` for nutrition facts and `/predict` for ML safety
- No side effects: nothing is written to Firestore logs from this panel

## API overview

- `GET /health` – server/model status
- `GET /foods` – list of foods
- `GET /food/{food_name}` – nutrition for a food
- `POST /predict` – safety prediction for a meal
- `POST /recommendations` – ML meal recommendations
- `POST /truly-personalized-recommendations` – per‑user model recommendations

## Tech stack

- React 18, Tailwind CSS, Heroicons
- FastAPI, Uvicorn, Pydantic
- scikit‑learn, joblib (RandomForest and improved models)
- Firebase Admin (optional, logging)
- CSV datasets (Food Master, User Logs)

## Troubleshooting

- If frontend says “port 3000 in use”, it will auto‑select 3001.
- If backend fails to import `main`, run from `backend` folder or use `uvicorn main:app`.
- Ensure the backend runs on port `8000` to match `frontend/src/services/api.js`.