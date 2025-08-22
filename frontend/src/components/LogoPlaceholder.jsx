import React from 'react';
import logoImage from '../assets/logo.png';

const LogoPlaceholder = ({ className = "w-8 h-8", isDark = false }) => {
  return (
    <div className={`${className} relative`}>
      <img 
        src={logoImage}
        alt="DiaLog Logo"
        className="w-full h-full object-contain rounded-full"
      />
    </div>
  );
};

export default LogoPlaceholder;
