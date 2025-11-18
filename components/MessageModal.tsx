import React, { useState, useEffect } from 'react';
import type { GameState } from '../types';

interface CountdownTimerProps {
  targetTime: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());

  useEffect(() => {
    if (targetTime <= 0) return;
    const timer = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  if (timeLeft <= 0) {
    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Next Word Available!</h3>
            <p>Refresh the page to play.</p>
        </div>
    );
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Next Word In</h3>
      <div className="text-3xl font-mono tracking-widest">
        <span>{String(hours).padStart(2, '0')}</span>:
        <span>{String(minutes).padStart(2, '0')}</span>:
        <span>{String(seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
};


interface MessageModalProps {
  gameState: GameState;
  solution: string;
  guesses: string[];
  maxGuesses: number;
  nextGameTime: number;
  onShare: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ gameState, solution, guesses, maxGuesses, nextGameTime, onShare }) => {
  if (gameState === 'playing') return null;

  const isWin = gameState === 'won';
  const title = isWin ? "Congratulations!" : "So Close!";
  const message = isWin ? "You guessed the word correctly." : `The word was: ${solution}`;

  const handleShare = () => {
    const gameDateKey = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const title = `SanSar ${gameDateKey} ${isWin ? guesses.length : 'X'}/${maxGuesses}`;
    
    const emojiGrid = guesses.map(guess => {
        return guess.split('').map((letter, i) => {
            if (solution[i] === letter) return '🟩';
            if (solution.includes(letter)) return '🟨';
            return '⬛';
        }).join('');
    }).join('\n');

    const shareText = `${title}\n\n${emojiGrid}`;
    navigator.clipboard.writeText(shareText).then(() => {
        onShare();
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
        <h2 className={`text-3xl font-bold mb-4 ${isWin ? 'text-green-400' : 'text-yellow-400'}`}>{title}</h2>
        <p className="text-lg mb-6">{message}</p>
        
        <div className="mt-6 border-t border-gray-700 pt-6">
            <CountdownTimer targetTime={nextGameTime} />
        </div>

        <button
          onClick={handleShare}
          className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg"
        >
          Share Results
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};