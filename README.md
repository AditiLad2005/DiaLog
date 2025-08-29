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

## Setup & Installation

### Initial Setup (First Time Only)

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies (for Firebase)
npm install
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install
```

### Quick Start (After Initial Setup)

#### Option 1: Start Both Servers Together
```bash
# From project root directory
.\start_dev.bat
```

#### Option 2: Start Servers Separately
```bash
# Backend Terminal
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend Terminal (in new terminal)
cd frontend
npm start
```

### Access URLs
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs