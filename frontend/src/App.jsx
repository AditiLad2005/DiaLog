import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { auth } from './services/firebase';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) {
    // Minimal placeholder while auth state resolves to prevent flicker/redirect loops on refresh
    return null;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

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
            
            {/* Profile Page (protected) */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* Login/Signup Page */}
            <Route path="/auth" element={<LoginSignup />} />
            
            {/* Meal Logging (protected) */}
            <Route path="/meal-log" element={<ProtectedRoute><MealLog /></ProtectedRoute>} />
            
            {/* Dashboard (protected) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Safety & Nutrition (protected) */}
            <Route path="/safety" element={<ProtectedRoute><FoodSafety /></ProtectedRoute>} />
            
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
