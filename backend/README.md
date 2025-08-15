# Backend - Diabetes Meal Planner

This backend is built with FastAPI and serves ML predictions and recommendations for the Diabetes Meal Planner app.

## Structure

- `data/` - Contains the dataset (`pred_food.csv`).
- `models/` - Contains the trained ML model (`diabetes_model.joblib`).
- `train_model.py` - Script to train and save the ML model.
- `main.py` - FastAPI app with `/predict`, `/recommend`, and `/log` endpoints.
- `requirements.txt` - Python dependencies.
- `.env` - API keys, Firebase credentials, etc. (should be gitignored)
- `venv/` - (Optional) Python virtual environment.

## Setup

1. Create and activate a virtual environment (optional but recommended).
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Add your `.env` file with necessary credentials.
4. Run the FastAPI app:
   ```sh
   uvicorn main:app --reload
   ```

## Endpoints
- `/predict` - Predicts diabetes risk based on meal input.
- `/recommend` - Recommends meals.
- `/log` - Logs user meal and sugar data.

---
See the main project `README.md` for overall details.
