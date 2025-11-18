import React, { useState, useEffect } from 'react';
import type { GameState } from '../types.ts';

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
        <div className="text-white/90">
            <h3 className="text-lg font-semibold mb-1">Next Word Available!</h3>
            <p className="text-sm opacity-80">Refresh to play.</p>
        </div>
    );
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="text-white">
      <h3 className="text-sm font-semibold uppercase tracking-widest mb-2 opacity-70">Next Word In</h3>
      <div className="text-4xl font-mono font-bold tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
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
  const message = isWin ? "You guessed the word correctly." : `The word was:`;

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in border border-white/10">
        <h2 className={`text-3xl font-bold mb-2 font-['Fredoka_One'] tracking-wide ${isWin ? 'text-green-400' : 'text-white'}`}>{title}</h2>
        
        <p className="text-lg mb-2 text-white/80">{message}</p>
        {!isWin && <p className="text-4xl font-bold text-[#4FC3F7] mb-6 tracking-widest drop-shadow-[0_0_10px_rgba(79,195,247,0.5)]">{solution}</p>}
        
        <div className="mt-6 border-t border-white/10 pt-6">
            <CountdownTimer targetTime={nextGameTime} />
        </div>

        <button
          onClick={handleShare}
          className="mt-8 w-full bg-green-500/80 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] border border-green-400/30 backdrop-blur-md hover:scale-[1.02]"
        >
          Share Results
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};