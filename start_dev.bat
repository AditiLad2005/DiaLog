@echo off
echo Starting DiaLog Development Environment...

:: Start the FastAPI backend server
start cmd /k "cd backend && python -m uvicorn main:app --reload"

:: Wait a bit for the server to start
echo Starting FastAPI server on http://localhost:8000...
timeout /t 5 /nobreak > nul

:: Start the frontend development server
start cmd /k "cd frontend && npm start"

echo Both servers are now running!
echo FastAPI: http://localhost:8000
echo Frontend: http://localhost:3000
