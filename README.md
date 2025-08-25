# DiaLog - Smart Diabetes Meal Analyzer

A full-stack web application that helps diabetic patients analyze meal safety using machine learning predictions based on their health profile and food nutritional data.

## Features

- **Smart Meal Analysis**: ML-powered predictions for meal safety
- **Personalized Recommendations**: Tailored advice based on user health profile  
- **Nutritional Information**: Detailed breakdown of calories, carbs, protein, etc.
- **Real-time Search**: Instant food search with 400+ food items
- **BMI Calculation**: Automatic BMI calculation and health insights
- **Risk Assessment**: Clear safety indicators with confidence scores

## Architecture

- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI with Machine Learning model
- **ML Model**: Random Forest Classifier
- **Data**: Food Master Dataset with nutritional information

## Prerequisites

- Python 3.8+ 
- Node.js 16+
- Git

## Quick Start

### 1. Clone & Setup
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
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## API Endpoints

### Health Check
```bash
GET /health
```

### Get Available Foods
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
POST /predict
Content-Type: application/json

{
  "age": 35,
  "gender": "Male",
  "weight_kg": 75.0,
  "height_cm": 175.0,
  "fasting_sugar": 95.0,
  "post_meal_sugar": 130.0,
  "meal_taken": "Boiled rice (Uble chawal)",
  "time_of_day": "Lunch",
  "portion_size": 1.0,
  "portion_unit": "bowl"
}
```

## Model Details

- **Algorithm**: Random Forest Classifier
- **Features**: Age, gender, BMI, blood sugar levels, food nutritional data
- **Training Data**: 2000+ synthetic samples based on real food data
- **Accuracy**: ~85-90% on test data
- **Safety Criteria**: Carb content, glycemic index, portion size, user health profile

## Project Structure

```
DiaLog/
│
├── frontend/                  # React + Tailwind (handled by teammates)
│   ├── src/
│   │   ├── components/
│   │   │   └── MealCard.jsx # Main UI component
│   │   └── App.jsx
│   ├── package.json
│   └── public/
└── README.md
```

## Troubleshooting

### Backend Issues

1. **Import Error**: Ensure virtual environment is activated
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

## Development

### Adding New Foods
1. Add entries to `Food_Master_Dataset_.csv`
2. Retrain the model: `python train_model.py`
3. Restart the API server

### Model Improvements
- Adjust Random Forest parameters in `train_model.py`
- Add new features to the feature engineering pipeline
- Collect real user data for better training

## Future Enhancements

- [ ] User authentication and meal history
- [ ] Mobile app development
- [ ] Integration with fitness trackers
- [ ] Doctor dashboard for patient monitoring
- [ ] Multi-language support
- [ ] Meal planning recommendations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Team

DiaLog Team - Diabetes Management Solution

## Acknowledgments

- Food nutritional data from comprehensive food database
- Machine learning libraries: scikit-learn, pandas, numpy
- Frontend framework: React.js with Tailwind CSS
- Backend framework: FastAPI
