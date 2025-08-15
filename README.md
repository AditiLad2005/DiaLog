# Diabetes Meal Planner

A web application for diabetes-friendly meal planning, blood sugar tracking, and personalized recommendations.

---

## Project Structure

```
DiaLog/
│
├── frontend/                  # React + Tailwind (handled by teammates)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Navbar.jsx     # Navigation bar
│   │   │   ├── Footer.jsx     # Footer
│   │   │   ├── MealCard.jsx   # Displays a meal item with image & details
│   │   │   └── ChartDisplay.jsx  # Displays sugar trends using Chart.js
│   │   ├── pages/             # Main pages for the app
│   │   │   ├── Home.jsx       # Landing page
│   │   │   ├── Dashboard.jsx  # Shows sugar trends & safe/risky stats
│   │   │   ├── MealLog.jsx    # User logs meals & sugar levels
│   │   │   ├── Login.jsx      # Firebase login/signup
│   │   │   └── NotFound.jsx   # 404 page
│   │   ├── services/          # API calls to backend & Firebase
│   │   │   ├── api.js         # Fetch requests to FastAPI (/predict, /recommend)
│   │   │   └── firebase.js    # Firebase config & Firestore functions
│   │   ├── App.jsx            # Main React app entry point
│   │   └── index.jsx          # Renders React into HTML
│   ├── public/                # Public assets
│   │   └── logo.png           # App logo
│   ├── package.json           # React dependencies
│   ├── tailwind.config.js     # Tailwind setup
│   └── README.md              # Frontend-specific README
│
├── backend/                   # FastAPI + ML Model (YOUR PART)
│   ├── data/                  
│   │   └── pred_food.csv      # Kaggle Indian Food + Diabetes dataset
│   ├── models/
│   │   └── diabetes_model.joblib  # Trained ML model
│   ├── train_model.py         # Script to train model & save as .joblib
│   ├── main.py                # FastAPI app with /predict, /recommend, /log endpoints
│   ├── requirements.txt       # Python dependencies for backend
│   ├── .env                   # API keys, Firebase credentials, etc. (gitignored)
│   ├── venv/                  # (Optional) Virtual environment for Python
│   └── README.md              # Backend-specific README
│
└── README.md                  # Main project readme (overview of frontend + backend)
```

---

## Dependencies

### Frontend

- **React** (via `create-react-app`)
- **Tailwind CSS**
- **Chart.js** (for sugar trend visualization)
- **Firebase** (authentication, Firestore)
- **Other common React dependencies** (see `frontend/package.json`)

### Backend

- **Python 3.8+**
- **FastAPI** (REST API)
- **Uvicorn** (ASGI server)
- **scikit-learn** (ML model)
- **joblib** (model serialization)
- **pandas** (data handling)
- **python-dotenv** (environment variable management)
- **firebase-admin** (for backend Firebase access)
- **Other dependencies** (see `backend/requirements.txt`)

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repo-url>
cd DiaLog
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
# To start the frontend (React app)
npm start
```

- Configure Firebase in `frontend/src/services/firebase.js` using your Firebase project credentials.
- Place your environment variables in `frontend/.env` (if needed).

---

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

- Place your environment variables (API keys, Firebase credentials, etc.) in `backend/.env`.
- Ensure `data/pred_food.csv` and `models/diabetes_model.joblib` exist (train the model if needed).

#### To train the ML model:

```bash
python train_model.py
```

#### To run the FastAPI server:

```bash
uvicorn main:app --reload
```

---

## Environment Variables

- **frontend/.env**: For frontend-specific secrets (if any).
- **backend/.env**: For backend secrets (API keys, Firebase credentials, etc.).
- Both are gitignored.

---

## Usage

- Access the frontend at [http://localhost:3000](http://localhost:3000)
- Backend API runs at [http://localhost:8000](http://localhost:8000)

---

## More Info

- See `frontend/README.md` and `backend/README.md` for more details on each part.
