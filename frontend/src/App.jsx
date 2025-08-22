import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Profile from './pages/Profile';
import RegisterProfile from './pages/Login'; // Keep for login functionality
import MealLog from './pages/MealLog';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import NotFound from './pages/NotFound';
import './tailwind.css';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        {/* Navigation */}
        <Navbar />
        
        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            {/* Home Page */}
            <Route path="/" element={<Home />} />
            
            {/* Profile Page */}
            <Route path="/profile" element={<Profile />} />
            
            {/* Login/Registration Page */}
            <Route path="/login" element={<RegisterProfile />} />
            
            {/* Meal Logging */}
            <Route path="/meal-log" element={<MealLog />} />
            
            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Feedback */}
            <Route path="/feedback" element={<Feedback />} />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}


export default App;
