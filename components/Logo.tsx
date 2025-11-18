import React from 'react';

const Logo: React.FC = () => (
  <div className="flex flex-col items-center select-none">
    <div className="flex items-center justify-center">
      <h1 className="text-4xl font-['Fredoka_One'] tracking-wide">
        <span style={{ color: '#FBBF24' }}>Sun</span>
        <span style={{ color: '#60A5FA' }}>Sar</span>
      </h1>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1 -mt-1">
        <circle cx="12" cy="12" r="5" fill="#FBBF24"/>
        <line x1="12" y1="1" x2="12" y2="4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="20" x2="12" y2="23" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="1" y1="12" x2="4" y2="12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="12" x2="23" y2="12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    <p className="text-xs font-semibold text-gray-400 tracking-wider -mt-1">Fun with words</p>
  </div>
);

export default Logo;
