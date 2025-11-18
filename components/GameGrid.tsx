
import React from 'react';
import { WORD_LENGTH } from '../constants';
import type { LetterStatus } from '../types';

interface GameGridProps {
  guesses: string[];
  currentGuess: string;
  solution: string;
  shakeRowIndex: number | null;
  maxGuesses: number;
}

interface TileProps {
  letter: string;
  status: LetterStatus;
  isRevealed: boolean;
  index: number;
}

const getTileStatus = (letter: string, index: number, solution: string): LetterStatus => {
    if (solution[index] === letter) {
      return 'correct';
    } else if (solution.includes(letter)) {
      return 'present';
    } else {
      return 'absent';
    }
};

const Tile: React.FC<TileProps> = ({ letter, status, isRevealed, index }) => {
  const statusClasses = {
    correct: 'bg-green-600 border-green-600',
    present: 'bg-yellow-500 border-yellow-500',
    absent: 'bg-gray-700 border-gray-700',
    empty: 'bg-transparent border-gray-600',
  };

  const animationDelay = `${index * 100}ms`;
  const baseClasses = 'w-16 h-16 md:w-20 md:h-20 border-2 flex items-center justify-center text-3xl md:text-4xl font-bold uppercase transition-all duration-500 transform';
  const revealedClasses = `[transform:rotateX(180deg)] ${statusClasses[status]}`;

  return (
    <div className="[perspective:1000px]">
      <div 
        className={`${baseClasses} ${isRevealed ? revealedClasses : statusClasses['empty']}`}
        style={{ transitionDelay: animationDelay }}
      >
        <div className="[transform:rotateX(180deg)]">{letter}</div>
      </div>
    </div>
  );
};


interface RowProps {
    guess?: string;
    currentGuess?: string;
    solution?: string;
    isCompleted?: boolean;
    isShaking?: boolean;
}

const Row: React.FC<RowProps> = ({ guess, currentGuess, solution, isCompleted, isShaking }) => {
    const letters = (guess || currentGuess || '').padEnd(WORD_LENGTH, ' ').split('');
    const shakeClass = isShaking ? 'animate-shake' : '';

    return (
        <div className={`grid grid-cols-5 gap-2 ${shakeClass}`}>
            {letters.map((letter, i) => (
                isCompleted && guess && solution ? (
                    <Tile 
                        key={i} 
                        letter={letter} 
                        status={getTileStatus(letter, i, solution)} 
                        isRevealed={true}
                        index={i}
                    />
                ) : (
                    <div key={i} className="w-16 h-16 md:w-20 md:h-20 border-2 border-gray-600 flex items-center justify-center text-3xl md:text-4xl font-bold uppercase">
                        {letter}
                    </div>
                )
            ))}
        </div>
    );
}

export const GameGrid: React.FC<GameGridProps> = ({ guesses, currentGuess, solution, shakeRowIndex, maxGuesses }) => {
  const emptyRows = Array(Math.max(0, maxGuesses - guesses.length - 1)).fill(null);

  return (
    <div className="grid grid-rows-5 gap-2">
      {guesses.map((guess, i) => (
        <Row key={i} guess={guess} solution={solution} isCompleted />
      ))}
      {guesses.length < maxGuesses && (
        <Row currentGuess={currentGuess} isShaking={shakeRowIndex === guesses.length} />
      )}
      {emptyRows.map((_, i) => (
        <Row key={i + guesses.length + 1} />
      ))}
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};
