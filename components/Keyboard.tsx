import React from 'react';
import { KEYBOARD_LAYOUT } from '../constants';
import type { KeyStatus } from '../types';

interface KeyboardProps {
  onKeyInput: (key: string) => void;
  keyStatuses: KeyStatus;
}

interface KeyProps {
    value: string;
    status?: 'correct' | 'present' | 'absent';
    onClick: (value: string) => void;
}

const Key: React.FC<KeyProps> = ({ value, status, onClick }) => {
    // Glassy styles for keys
    const statusClasses = {
        correct: 'bg-green-500/60 border-green-400/50 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]',
        present: 'bg-yellow-500/60 border-yellow-400/50 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]',
        absent: 'bg-white/5 border-white/5 text-white/30', // Dimmed out
        default: 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30',
    };

    const isSpecialKey = value === 'ENTER' || value === 'BACKSPACE';
    
    // Combined classes
    const baseClasses = `
        h-14 rounded-lg font-bold uppercase flex items-center justify-center
        transition-all duration-200 cursor-pointer select-none backdrop-blur-sm border
        shadow-sm active:scale-95
    `;
    
    const widthClasses = isSpecialKey ? 'px-2 text-xs md:text-sm flex-grow-[1.5]' : 'flex-1 text-sm md:text-base';
    const colorClasses = status ? statusClasses[status] : statusClasses.default;

    return (
        <button className={`${baseClasses} ${widthClasses} ${colorClasses}`} onClick={() => onClick(value)}>
            {value === 'BACKSPACE' ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
            ) : value}
        </button>
    )
}

export const Keyboard: React.FC<KeyboardProps> = ({ onKeyInput, keyStatuses }) => {
  return (
    <div className="space-y-2 w-full">
      {KEYBOARD_LAYOUT.map((row, i) => (
        <div key={i} className="flex justify-center space-x-1.5 w-full">
          {row.map((key) => (
            <Key
              key={key}
              value={key}
              status={keyStatuses[key]}
              onClick={onKeyInput}
            />
          ))}
        </div>
      ))}
    </div>
  );
};