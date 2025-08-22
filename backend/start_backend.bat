@echo off
echo Starting DiaLog backend server...

:: Kill any existing Python processes running uvicorn
taskkill /f /im python.exe /fi "WINDOWTITLE eq uvicorn*" 2>nul

:: Start the FastAPI backend server
echo Starting FastAPI server on http://localhost:8000...
start "DiaLog-Backend" cmd /k "cd /d %~dp0 && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Wait for server to start
timeout /t 5 /nobreak > nul

:: Test if the server is running
curl -s http://localhost:8000/health

echo.
echo Backend server started! Press any key to exit...
pause > nul
