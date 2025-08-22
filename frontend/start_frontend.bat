@echo off
echo Starting DiaLog frontend...

:: Navigate to frontend directory
cd /d %~dp0..\frontend

:: Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

:: Start the React development server
echo Starting React app on http://localhost:3000...
start "DiaLog-Frontend" cmd /k "npm start"

echo.
echo Frontend server started! Press any key to exit...
pause > nul
