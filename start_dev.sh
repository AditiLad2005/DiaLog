#!/bin/bash

# Run this script to start both backend and frontend

# Start the backend FastAPI server (run in background)
cd backend
python -m uvicorn main:app --reload &

# Wait a bit for the server to start
echo "Starting FastAPI server on http://localhost:8000..."
sleep 5

# Start the frontend
cd ../frontend
npm install
npm start

# When the frontend terminates, kill the backend server
trap 'kill $(jobs -p)' EXIT
