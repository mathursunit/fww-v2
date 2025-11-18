import React from 'react';
import { KEYBOARD_LAYOUT } from '../constants';
import { KeyStatus } from '../types';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  keyStatuses: KeyStatus;
}

const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, keyStatuses }) => {
  const getKeyClass = (key: string): string => {
    const baseClass = "py-3 sm:py-4 rounded-md flex items-center justify-center font-bold uppercase cursor-pointer transition-colors duration-200 text-white active:bg-gray-500";
    const status = keyStatuses[key.toUpperCase()];
    
    switch (status) {
      case 'correct': return `${baseClass} bg-[var(--color-correct)] hover:opacity-90`;
      case 'present': return `${baseClass} bg-[var(--color-present)] hover:opacity-90`;
      case 'absent': return `${baseClass} bg-[var(--color-absent)] opacity-60 hover:opacity-90`;
      default: return `${baseClass} bg-[var(--key-bg)] hover:bg-gray-500`;
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {row.map(key => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              className={`${getKeyClass(key)} ${key.length > 1 ? 'flex-[1.5] px-2 text-xs' : 'flex-1 text-base'}`}
            >
              {key === 'BACKSPACE' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                </svg>
              ) : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;