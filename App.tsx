import React, { useState, useEffect } from 'react';
import { GameGrid } from './components/GameGrid';
import { Keyboard } from './components/Keyboard';
import { MessageModal } from './components/MessageModal';
import { HintConfirmationModal } from './components/HintConfirmationModal';
import { StatsModal } from './components/StatsModal';
import { getWordOfTheDay, getWordHint } from './services/geminiService';
import { getGameDateKey, getTimeToNextGame } from './utils/dateUtils';
import { WORD_LENGTH, MAX_GUESSES } from './constants';
import type { GameState, KeyStatus, SavedGameState, GameStats } from './types';

declare global {
  interface Window {
    confetti?: (options: any) => void;
  }
}

const App: React.FC = () => {
  const [solution, setSolution] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus>({});
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [maxGuesses, setMaxGuesses] = useState<number>(MAX_GUESSES);
  const [isHintModalOpen, setIsHintModalOpen] = useState<boolean>(false);
  const [hintText, setHintText] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [nextGameTime, setNextGameTime] = useState<number>(0);
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 });
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const initializeGame = async () => {
      const gameDateKey = getGameDateKey();
      const savedStateString = localStorage.getItem('gameState');
      const savedStatsString = localStorage.getItem('gameStats');
      let savedState: SavedGameState | null = null;

      if (savedStatsString) {
        setStats(JSON.parse(savedStatsString));
      }

      if (savedStateString) {
        try {
          savedState = JSON.parse(savedStateString);
        } catch (e) {
          console.error("Failed to parse saved state", e);
          localStorage.removeItem('gameState');
        }
      }

      if (savedState && savedState.lastPlayed === gameDateKey) {
        setSolution(savedState.solution);
        setGuesses(savedState.guesses);
        setGameState(savedState.gameState);
        
        const newKeyStatuses: KeyStatus = {};
        savedState.guesses.forEach(guess => {
            guess.split('').forEach((letter, index) => {
                 if (savedState.solution[index] === letter) {
                    newKeyStatuses[letter] = 'correct';
                } else if (savedState.solution.includes(letter)) {
                    if (newKeyStatuses[letter] !== 'correct') {
                        newKeyStatuses[letter] = 'present';
                    }
                } else {
                    newKeyStatuses[letter] = 'absent';
                }
            });
        });
        setKeyStatuses(newKeyStatuses);
        
      } else {
        setLoadingMessage("Loading today's word...");
        const newWord = await getWordOfTheDay();
        const upperWord = newWord.toUpperCase();
        setSolution(upperWord);
        setGuesses([]);
        setGameState('playing');
        setKeyStatuses({});
      }

      setNextGameTime(Date.now() + getTimeToNextGame());
      setIsInitialized(true);
      setIsLoading(false);
    };

    initializeGame();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const gameDateKey = getGameDateKey();
    const currentState: SavedGameState = {
      solution,
      guesses,
      gameState,
      lastPlayed: gameDateKey,
    };
    localStorage.setItem('gameState', JSON.stringify(currentState));
  }, [guesses, gameState, solution, isInitialized]);
  
  useEffect(() => {
    if (gameState === 'won' && window.confetti) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        window.confetti!({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        window.confetti!({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [gameState]);

  useEffect(() => {
    if (!isInitialized || gameState === 'playing') return;

    const gameDateKey = getGameDateKey();
    const lastStatUpdateDate = localStorage.getItem('lastStatUpdate');

    if (gameDateKey !== lastStatUpdateDate) {
      const didWin = gameState === 'won';
      
      setStats(prevStats => {
        const newStats: GameStats = {
            ...prevStats,
            gamesPlayed: prevStats.gamesPlayed + 1,
            gamesWon: didWin ? prevStats.gamesWon + 1 : prevStats.gamesWon,
            currentStreak: didWin ? prevStats.currentStreak + 1 : 0,
        };
        newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
        
        localStorage.setItem('gameStats', JSON.stringify(newStats));
        localStorage.setItem('lastStatUpdate', gameDateKey);
        
        return newStats;
      });
    }
  }, [gameState, isInitialized]);


  const handleMessage = (msg: string, duration: number = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  const shakeCurrentRow = () => {
    setShakeRowIndex(guesses.length);
    setTimeout(() => setShakeRowIndex(null), 500);
  }

  const handleSubmit = () => {
    if (gameState !== 'playing') return;

    if (currentGuess.length !== WORD_LENGTH) {
      handleMessage('Not enough letters');
      shakeCurrentRow();
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);

    const newKeyStatuses = { ...keyStatuses };
    currentGuess.split('').forEach((letter, index) => {
      if (solution[index] === letter) {
        newKeyStatuses[letter] = 'correct';
      } else if (solution.includes(letter)) {
        if (newKeyStatuses[letter] !== 'correct') {
          newKeyStatuses[letter] = 'present';
        }
      } else {
        newKeyStatuses[letter] = 'absent';
      }
    });
    setKeyStatuses(newKeyStatuses);
    
    setCurrentGuess('');

    if (currentGuess === solution) {
      setGameState('won');
      setTimeout(() => handleMessage('You won!', 5000), 500);
    } else if (newGuesses.length === maxGuesses) {
      setGameState('lost');
    }
  };

  const handleKeyInput = (key: string) => {
    if (gameState !== 'playing') return;

    if (key === 'ENTER') {
      handleSubmit();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
      setCurrentGuess((prev) => prev + key);
    }
  };

  const handleHint = () => {
    if (hintUsed || gameState !== 'playing') return;
    setIsHintModalOpen(true);
  };

  const handleConfirmHint = async () => {
    setIsHintModalOpen(false);
    if (hintUsed || gameState !== 'playing') return;
    
    setIsLoading(true);
    setLoadingMessage('Generating your hint...');
    const hint = await getWordHint(solution);
    setHintText(hint);
    setHintUsed(true);
    setMaxGuesses(guesses.length + 1);
    handleMessage('Hint revealed! You have one guess left.');
    setIsLoading(false);
    setLoadingMessage('');
  };

  const handleCancelHint = () => {
    setIsHintModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLoading || gameState !== 'playing') return;
      
      let key = event.key.toUpperCase();
      if (key === 'BACKSPACE' || key === 'ENTER' || (key.length === 1 && key >= 'A' && key <= 'Z')) {
        handleKeyInput(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGuess, gameState, isLoading]);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-2 md:p-4 text-center overflow-hidden">
      {/* Header */}
      <header className="w-full max-w-md mx-auto relative mb-2 px-4 py-3 rounded-2xl glass-panel flex items-center justify-between">
        <div className="flex-1 flex justify-start">
            <button onClick={() => setIsStatsModalOpen(true)} className="p-2 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-full" aria-label="Show statistics">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </button>
        </div>

        <div className="flex flex-col items-center justify-center">
            <div className="flex items-center relative">
                <span className="font-['Fredoka_One'] text-4xl md:text-5xl text-[#FFC107] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Sun</span>
                <span className="font-['Fredoka_One'] text-4xl md:text-5xl text-[#4FC3F7] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Sar</span>
                <div className="ml-1 animate-[spin_12s_linear_infinite]">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="#FFC107" className="drop-shadow-md">
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
                        {/* Smile */}
                        <path d="M9 13c1.5 1.5 4.5 1.5 6 0" stroke="#B36B00" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                        <circle cx="9" cy="10" r="0.8" fill="#B36B00" />
                        <circle cx="15" cy="10" r="0.8" fill="#B36B00" />
                    </svg>
                </div>
            </div>
            <p className="font-['Nunito'] text-sm md:text-base text-gray-300 tracking-widest font-semibold -mt-1">Fun with words</p>
        </div>

        <div className="flex-1 flex justify-end">
            <button onClick={handleHint} disabled={hintUsed || gameState !== 'playing'} className="p-2 text-white/70 hover:text-white disabled:text-white/20 disabled:cursor-not-allowed transition-colors hover:bg-white/10 rounded-full" aria-label="Get a hint">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </button>
        </div>
      </header>

      <div className="h-8 text-center my-1 text-lg font-bold text-white drop-shadow-md">
          {message}
      </div>

      <main className="flex-grow flex flex-col justify-center w-full max-w-md mx-auto">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-12 border-4 border-white/20 border-t-[#4FC3F7] rounded-full animate-spin"></div>
             <div className="text-xl font-nunito font-semibold tracking-wide">{loadingMessage}</div>
           </div>
        ) : (
          <>
            <GameGrid
              guesses={guesses}
              currentGuess={currentGuess}
              solution={solution}
              shakeRowIndex={shakeRowIndex}
              maxGuesses={maxGuesses}
            />
            {hintText && (
                <div className="mt-6 p-4 glass-panel rounded-xl text-lg text-[#FFC107] italic animate-fade-in shadow-[0_0_15px_rgba(255,193,7,0.2)] border-l-4 border-l-[#FFC107]">
                    <strong className="block text-xs uppercase tracking-widest opacity-80 not-italic mb-1">AI Hint</strong>
                    {hintText}
                </div>
            )}
          </>
        )}
      </main>
      
      <div className="w-full max-w-lg mx-auto p-2 mt-4">
         <Keyboard onKeyInput={handleKeyInput} keyStatuses={keyStatuses} />
      </div>

      {(gameState === 'won' || gameState === 'lost') && (
        <MessageModal
          gameState={gameState}
          solution={solution}
          guesses={guesses}
          maxGuesses={maxGuesses}
          nextGameTime={nextGameTime}
          onShare={() => handleMessage('Results copied to clipboard!')}
        />
      )}

      {isHintModalOpen && (
        <HintConfirmationModal
            onConfirm={handleConfirmHint}
            onCancel={handleCancelHint}
        />
      )}

      {isStatsModalOpen && (
        <StatsModal
            stats={stats}
            onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;