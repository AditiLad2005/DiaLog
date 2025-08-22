# Diabetes Meal Planner (DiaLog)

A comprehensive diabetes management application that helps users track their meals, monitor blood sugar levels, and get AI-powered insights for better diabetes care.

## 🏗️ Project Structure

```
diabetes-meal-planner/
│
├── frontend/                                   # React + Tailwind frontend
│   ├── public/                                 # Public static assets
│   │   ├── favicon.ico
│   │   ├── logo.png
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── assets/                             # Images, icons, static resources
│   │   │   ├── meals/                          # Meal-related images
│   │   │   │   ├── idli.jpg
│   │   │   │   ├── dosa.jpg
│   │   │   │   └── poha.jpg
│   │   │   ├── icons/                          # SVG/PNG icons
│   │   │   │   ├── safe-icon.svg
│   │   │   │   └── risky-icon.svg
│   │   │   ├── charts/                         # Chart placeholder images
│   │   │   └── styles/                         # Custom CSS
│   │   │
│   │   ├── components/                         # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── MealCard.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   ├── DonutChart.jsx
│   │   │   ├── LineChart.jsx
│   │   │   └── SafeMealSuggestions.jsx
│   │   │
│   │   ├── pages/                              # Page-level components
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MealLog.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Feedback.jsx
│   │   │   └── NotFound.jsx
│   │   │
│   │   ├── services/                           # API & Firebase calls
│   │   │   ├── api.js                          # FastAPI backend calls
│   │   │   ├── firebase.js                     # Firebase setup
│   │   │   ├── mlData.js                       # ML data service
│   │   │   └── storage.js                      # Firebase Storage uploads
│   │   │
│   │   ├── App.jsx                             # Main app component
│   │   ├── index.jsx                           # React entry point
│   │   ├── tailwind.css                        # Tailwind main CSS
│   │   └── config.js                           # Global constants
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   └── README.md
│
├── backend/                                    # FastAPI + ML backend
│   ├── data/
│   │   └── pred_food.csv                       # Indian Food + Diabetes dataset
│   │
│   ├── models/
│   │   ├── diabetes_model.joblib               # Trained ML model
│   │   ├── feature_columns.joblib              # Feature columns
│   │   └── scaler.joblib                       # Data scaler
│   │
│   ├── static/                                 # Static files served by FastAPI
│   │   └── meal_images/                        # Meal images for API
│   │       ├── idli.jpg
│   │       └── dosa.jpg
│   │
│   ├── train_model.py                          # ML model training script
│   ├── main.py                                 # FastAPI app entry point
│   ├── firebase_admin_setup.py                 # Firebase admin configuration
│   ├── seed_firestore.py                      # Database seeding script
│   ├── requirements.txt                        # Python dependencies
│   ├── .env                                    # Environment variables
│   ├── venv/                                   # Python virtual environment
│   └── README.md
│
├── docs/                                       # Project documentation
│   ├── architecture-diagram.png
│   ├── api-endpoints.md
│   ├── ml-workflow.md
│   └── ui-wireframes.png
│
└── README.md                                   # This file
```

## 🚀 Features

- **Meal Logging**: Easy-to-use interface for logging meals with blood sugar tracking
- **AI-Powered Insights**: Machine learning model provides personalized recommendations
- **Interactive Charts**: Blood sugar trends and meal risk analysis visualization
- **Risk Assessment**: Real-time meal risk evaluation based on diabetes management
- **Responsive Design**: Modern UI with dark mode support
- **User Profiles**: Comprehensive user management and health tracking

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - Modern React with hooks
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Recharts** - Interactive data visualization
- **Heroicons** - Beautiful SVG icons
- **React Router** - Client-side routing

### Backend
- **FastAPI** - High-performance Python web framework
- **Scikit-learn** - Machine learning model
- **Pandas & NumPy** - Data processing
- **Joblib** - Model serialization
- **Firebase Admin SDK** - Database and authentication

### Database
- **Firebase Firestore** - NoSQL document database
- **Firebase Storage** - File storage for images

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Firebase project (optional, for full features)

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
The app will run on `http://localhost:3000`

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
The API will run on `http://localhost:8000`

### ML Model Training
```bash
cd backend
python train_model.py
```

## 📊 ML Model Details

The application uses a machine learning model trained on Indian food and diabetes data to:
- Predict blood sugar impact of meals
- Assess meal risk levels (Low/Medium/High)
- Provide personalized recommendations
- Generate health insights and trends

## 🎨 UI/UX Features

- **Muted Green & Peach Color Scheme** - Calming, health-focused design
- **Glassmorphism Effects** - Modern backdrop blur and transparency
- **Dark Mode Support** - Automatic theme switching
- **Responsive Design** - Mobile-first approach
- **Interactive Charts** - Real-time data visualization
- **Accessibility** - WCAG compliant design

## 📱 Pages & Components

### Pages
- **Home** - Landing page with app overview
- **Dashboard** - Main health analytics and insights
- **Meal Log** - Blood sugar and meal tracking
- **Profile** - User profile management
- **Feedback** - User feedback and support

### Key Components
- **BloodSugarLineChart** - 7-day blood sugar trends
- **MealRiskDonutChart** - Risk distribution visualization
- **SafeMealSuggestions** - AI-powered meal recommendations
- **MealCard** - Individual meal display component

## 🔧 Configuration

### Environment Variables
Backend `.env` file:
```env
HOST=127.0.0.1
PORT=8000
DEBUG=True
MODEL_PATH=./models/diabetes_model.joblib
DATABASE_URL=sqlite:///./diabetes_app.db
```

### Tailwind Configuration
Custom color scheme in `tailwind.config.js`:
- Primary: Muted Green shades
- Secondary: Peach tones
- Success/Warning/Danger variants

## 📈 Future Enhancements

- Wearable device integration
- Advanced meal planning
- Medication tracking
- Doctor portal
- Family sharing features
- Export health reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Frontend Development** - React & Tailwind implementation
- **Backend Development** - FastAPI & ML integration  
- **ML Engineering** - Diabetes prediction model
- **UI/UX Design** - Modern health-focused design

---

For detailed setup instructions and API documentation, see the individual README files in the `frontend/` and `backend/` directories.

---

## Quick Install Commands

Run these commands from the root of the project to install all dependencies for both frontend and backend.

### Frontend

```bash
cd frontend
npm install
npm install react react-dom react-router-dom tailwindcss chart.js firebase
# (Optional) If using create-react-app, install it globally:
# npm install -g create-react-app
```
The app will run on `http://localhost:3000`

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn scikit-learn joblib pandas python-dotenv firebase-admin
# Or, to install all dependencies from requirements.txt:
pip install -r requirements.txt
```

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
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. **Model Not Found**: Run the training script
```bash
python train_model.py
```

3. **Dataset Not Found**: Ensure `Food_Master_Dataset_.csv` is in `backend/data/`

### Frontend Issues

1. **CORS Error**: Make sure backend is running on port 8000
2. **API Connection**: Check if backend health endpoint responds: http://localhost:8000/health

## 🚧 Development

### Adding New Foods
1. Add entries to `Food_Master_Dataset_.csv`
2. Retrain the model: `python train_model.py`
3. Restart the API server

### Model Improvements
- Adjust Random Forest parameters in `train_model.py`
- Add new features to the feature engineering pipeline
- Collect real user data for better training

## 📈 Future Enhancements

- [ ] User authentication and meal history
- [ ] Mobile app development
- [ ] Integration with fitness trackers
- [ ] Doctor dashboard for patient monitoring
- [ ] Multi-language support
- [ ] Meal planning recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

DiaLog Team - Diabetes Management Solution

## 🙏 Acknowledgments

- Food nutritional data from comprehensive food database
- Machine learning libraries: scikit-learn, pandas, numpy
- Frontend framework: React.js with Tailwind CSS
- Backend framework: FastAPI
