import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Profile from './pages/Profile';
// ...existing code...
import LoginSignup from './pages/LoginSignup';
import MealLog from './pages/MealLog';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import NotFound from './pages/NotFound';
import './tailwind.css';
import FoodSafety from './pages/FoodSafety';
import { TranslationProvider } from './contexts/TranslationContext';
import LiveTranslator from './components/LiveTranslator';

function App() {
  return (
    <Router>
      <TranslationProvider>
      <LiveTranslator />
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
            
            {/* Login/Signup Page */}
            <Route path="/auth" element={<LoginSignup />} />
            
            {/* Meal Logging */}
            <Route path="/meal-log" element={<MealLog />} />
            
            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Safety & Nutrition */}
            <Route path="/safety" element={<FoodSafety />} />
            
            {/* Feedback */}
            <Route path="/feedback" element={<Feedback />} />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
      </TranslationProvider>
    </Router>
  );
}


export default App;
