
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
    const statusClasses = {
        correct: 'bg-green-600 text-white',
        present: 'bg-yellow-500 text-white',
        absent: 'bg-gray-700 text-gray-400',
        default: 'bg-gray-500 hover:bg-gray-600',
    };

    const isSpecialKey = value === 'ENTER' || value === 'BACKSPACE';
    const classes = `
        h-14 rounded-md font-bold uppercase flex items-center justify-center
        transition-colors cursor-pointer text-sm md:text-base
        ${isSpecialKey ? 'px-3 text-xs md:text-sm flex-grow' : 'flex-1'}
        ${status ? statusClasses[status] : statusClasses.default}
    `;

    return (
        <button className={classes} onClick={() => onClick(value)}>
            {value === 'BACKSPACE' ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12" />
                </svg>
            ) : value}
        </button>
    )
}

export const Keyboard: React.FC<KeyboardProps> = ({ onKeyInput, keyStatuses }) => {
  return (
    <div className="space-y-2">
      {KEYBOARD_LAYOUT.map((row, i) => (
        <div key={i} className="flex justify-center space-x-1">
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
