@echo off
echo DiaLog System Diagnostics
echo ==============================================

echo.
echo Checking if backend server is running...
curl -s --connect-timeout 5 http://localhost:8000/health > nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend server is running on http://localhost:8000
    echo.
    echo Testing foods endpoint...
    curl -s http://localhost:8000/foods | findstr /C:"foods"
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Foods endpoint is working
    ) else (
        echo [FAIL] Foods endpoint is not responding correctly
    )
) else (
    echo [FAIL] Backend server is not running on http://localhost:8000
)

echo.
echo Checking if frontend server is running...
curl -s --connect-timeout 5 http://localhost:3000 > nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend server is running on http://localhost:3000
) else (
    echo [FAIL] Frontend server is not running on http://localhost:3000
)

echo.
echo System paths:
echo - Backend path: %~dp0backend
echo - Frontend path: %~dp0frontend
echo - Data path: %~dp0backend\data

echo.
echo Checking for required files:
if exist "%~dp0backend\data\Food_Master_Dataset_.csv" (
    echo [OK] Food_Master_Dataset_.csv exists
) else (
    echo [FAIL] Food_Master_Dataset_.csv is missing
)

if exist "%~dp0backend\models\diabetes_model.joblib" (
    echo [OK] diabetes_model.joblib exists
) else (
    echo [FAIL] diabetes_model.joblib is missing
)

echo.
echo Diagnostics completed.
echo ==============================================
pause
