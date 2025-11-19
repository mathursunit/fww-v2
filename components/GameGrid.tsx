import React from 'react';
import { MAX_GUESSES, WORD_LENGTH } from '../constants.ts';
import { LetterStatus } from '../types.ts';

interface GameGridProps {
  guesses: string[];
  currentGuess: string;
  solution: string;
}

const GameGrid: React.FC<GameGridProps> = ({ guesses, currentGuess, solution }) => {
  
  const getStatusForLetter = (letter: string, index: number, guess: string): LetterStatus => {
    if (solution[index] === letter) return 'correct';
    
    // Handle duplicate letters correctly
    const solutionLetterCount = solution.split('').filter(l => l === letter).length;
    const correctGuessLetters = guess.split('').filter((l, i) => l === letter && solution[i] === l).length;
    const presentLettersBefore = guess.slice(0, index).split('').filter(l => l === letter && solution.includes(l) && solution[guess.indexOf(l)] !== l).length;

    if (solution.includes(letter) && (correctGuessLetters + presentLettersBefore < solutionLetterCount)) {
        return 'present';
    }
    
    return 'absent';
  };
  
  const getTileClass = (status: LetterStatus, letter: string): string => {
    const baseClass = "aspect-square border-2 flex items-center justify-center text-3xl sm:text-4xl font-bold uppercase transition-all duration-300 transform rounded-md";
    const borderClass = letter ? 'border-[var(--color-filled-border)]' : 'border-[var(--color-empty-border)]';
    
    switch (status) {
      case 'correct': return `${baseClass} bg-[var(--color-correct)] border-[var(--color-correct)] text-white`;
      case 'present': return `${baseClass} bg-[var(--color-present)] border-[var(--color-present)] text-white`;
      case 'absent': return `${baseClass} bg-[var(--color-absent)] border-[var(--color-absent)] text-gray-300`;
      default: return `${baseClass} bg-transparent ${borderClass}`;
    }
  };

  return (
    <div className="grid grid-rows-5 gap-1.5 w-full">
      {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
            const isSubmittedRow = rowIndex < guesses.length;
            const guess = isSubmittedRow ? guesses[rowIndex] : (rowIndex === guesses.length ? currentGuess : '');
            const letter = guess[colIndex] || '';
            const status = isSubmittedRow ? getStatusForLetter(letter, colIndex, guesses[rowIndex]) : 'empty';
            const style = isSubmittedRow ? { transitionDelay: `${colIndex * 100}ms` } : {};
            
            return (
              <div 
                key={colIndex} 
                style={style} 
                className={`${getTileClass(status, letter)} ${isSubmittedRow ? 'animate-flip' : ''}`}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default GameGrid;