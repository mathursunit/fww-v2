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
    correct: 'bg-green-500/60 border-green-400/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]',
    present: 'bg-yellow-500/60 border-yellow-400/50 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]',
    absent: 'bg-gray-700/60 border-gray-600/50 text-white/80',
    empty: 'bg-white/5 border-white/10',
    filled: 'bg-white/10 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]'
  };

  const animationDelay = `${index * 100}ms`;

  const flipperClasses = `relative w-14 h-14 md:w-16 md:h-16 transition-transform duration-500 [transform-style:preserve-3d] ${isRevealed ? '[transform:rotateX(180deg)]' : ''}`;
  
  const faceClasses = 'absolute inset-0 w-full h-full rounded-lg flex items-center justify-center text-3xl md:text-4xl font-bold uppercase backdrop-blur-sm font-fredoka [backface-visibility:hidden] border-2 text-white';
  
  const frontStyle = !isRevealed && letter.trim() ? statusClasses.filled : statusClasses.empty;
  const backStyle = statusClasses[status];

  return (
    <div className="[perspective:1000px]">
      <div 
        className={flipperClasses}
        style={{ transitionDelay: animationDelay }}
      >
        {/* Front Face */}
        <div className={`${faceClasses} ${frontStyle}`}>
          {letter}
        </div>
        {/* Back Face */}
        <div className={`${faceClasses} [transform:rotateX(180deg)] ${backStyle}`}>
          {letter}
        </div>
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
                    <Tile 
                        key={i} 
                        letter={letter} 
                        status="empty" 
                        isRevealed={false}
                        index={i}
                    />
                )
            ))}
        </div>
    );
}

export const GameGrid: React.FC<GameGridProps> = ({ guesses, currentGuess, solution, shakeRowIndex, maxGuesses }) => {
  const emptyRows = Array(Math.max(0, maxGuesses - guesses.length - 1)).fill(null);

  return (
    <div className="grid grid-rows-5 gap-2 p-2">
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
        .font-fredoka {
            font-family: 'Fredoka One', cursive;
        }
      `}</style>
    </div>
  );
};