@echo off
echo Testing DiaLog API connection...

echo.
echo Testing API health endpoint...
curl -s http://localhost:8000/health
echo.

echo.
echo Testing foods endpoint...
curl -s http://localhost:8000/foods
echo.

echo.
echo Done!
