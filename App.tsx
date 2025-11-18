import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, KeyStatus, GameStats, SavedGameState } from './types';
import { MAX_GUESSES, WORD_LENGTH, APP_VERSION } from './constants';
import { getGameDateKey } from './utils/dateUtils';
import { useWordList, getWordOfTheDay } from './services/wordService';
import GameGrid from './components/GameGrid';
import Keyboard from './components/Keyboard';
import Toast from './components/Toast';
import StatsModal from './components/StatsModal';
import EndGameModal from './components/EndGameModal';
import Logo from './components/Logo';
import Legend from './components/Legend';
import StatsIcon from './components/icons/StatsIcon';
import HintIcon from './components/icons/HintIcon';

const App: React.FC = () => {
  const [solution, setSolution] = useState<string>('');
  const [solutionDefinition, setSolutionDefinition] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus>({});
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showEndGameModal, setShowEndGameModal] = useState<boolean>(false);
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 });
  const [hint, setHint] = useState<string>('');
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const confettiRan = useRef(false);

  const { words, validWords } = useWordList();
  
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

  const onNewGame = useCallback(() => {
    if (words.size === 0) return;
    const gameDateKey = getGameDateKey();
    const { solution: newSolution, definition } = getWordOfTheDay(words, gameDateKey);
    setSolution(newSolution);
    setSolutionDefinition(definition);
    setGuesses([]);
    setCurrentGuess('');
    setGameState('playing');
    setKeyStatuses({});
    setHint('');
    setHintUsed(false);
    setShowEndGameModal(false);
    confettiRan.current = false;
  }, [words]);

  useEffect(() => {
      if (words.size === 0) return;
      const gameDateKey = getGameDateKey();
      
      const savedStats = localStorage.getItem('sansar-stats');
      if (savedStats) setStats(JSON.parse(savedStats));

      const savedState = localStorage.getItem('sansar-state');
      if (savedState) {
          const { solution: savedSolution, guesses: savedGuesses, gameState: savedGameState, lastPlayed, hint: savedHint, hintUsed: savedHintUsed } = JSON.parse(savedState) as SavedGameState;
          if (lastPlayed === gameDateKey) {
              const { definition } = getWordOfTheDay(words, gameDateKey);
              setSolution(savedSolution);
              setSolutionDefinition(definition);
              setGuesses(savedGuesses);
              setGameState(savedGameState);
              setHint(savedHint || '');
              setHintUsed(savedHintUsed || false);
              if (savedGameState !== 'playing') {
                  setShowEndGameModal(true);
              }
              // Recalculate key statuses
              const newKeyStatuses: KeyStatus = {};
              savedGuesses.forEach(g => {
                  g.split('').forEach((letter, i) => {
                      if (savedSolution[i] === letter) {
                          newKeyStatuses[letter] = 'correct';
                      } else if (savedSolution.includes(letter) && newKeyStatuses[letter] !== 'correct') {
                          newKeyStatuses[letter] = 'present';
                      } else if (!savedSolution.includes(letter)) {
                          newKeyStatuses[letter] = 'absent';
                      }
                  });
              });
              setKeyStatuses(newKeyStatuses);
              return;
          }
      }
      onNewGame();
  }, [words, onNewGame]);

  useEffect(() => {
      if (gameState !== 'playing') {
          setTimeout(() => {
            setShowEndGameModal(true);
            if (gameState === 'won' && !confettiRan.current) {
                const canvas = document.createElement('canvas');
                canvas.style.position = 'fixed';
                canvas.style.inset = '0';
                canvas.style.width = '100vw';
                canvas.style.height = '100vh';
                canvas.style.zIndex = '100';
                canvas.style.pointerEvents = 'none';
                document.body.appendChild(canvas);
                const myConfetti = (window as any).confetti.create(canvas, { resize: true });
                
                // Fire from left side
                myConfetti({
                  particleCount: 100,
                  angle: 60,
                  spread: 80,
                  origin: { x: 0, y: 0.8 }
                });
                 // Fire from right side
                myConfetti({
                  particleCount: 100,
                  angle: 120,
                  spread: 80,
                  origin: { x: 1, y: 0.8 }
                });

                confettiRan.current = true;
                setTimeout(() => document.body.removeChild(canvas), 5000);
            }
          }, 1200);
      }
  }, [gameState]);
  
  useEffect(() => {
      if(solution && gameState !== 'playing') {
        const gameDateKey = getGameDateKey();
        const stateToSave: SavedGameState = { solution, guesses, gameState, lastPlayed: gameDateKey, hint, hintUsed };
        localStorage.setItem('sansar-state', JSON.stringify(stateToSave));
      }
  }, [gameState, guesses, solution, hint, hintUsed]);

  useEffect(() => {
    localStorage.setItem('sansar-stats', JSON.stringify(stats));
  }, [stats]);


  const handleKeyPress = useCallback((key: string) => {
    if (gameState !== 'playing' || currentGuess.length >= WORD_LENGTH && key !== 'ENTER' && key !== 'BACKSPACE') return;

    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        showToast('Not enough letters');
        return;
      }
      if (!validWords.has(currentGuess)) {
        showToast('Not in word list');
        return;
      }
      
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      
      const newKeyStatuses = { ...keyStatuses };
      currentGuess.split('').forEach((letter, i) => {
        if (solution[i] === letter) {
            newKeyStatuses[letter] = 'correct';
        } else if (solution.includes(letter) && newKeyStatuses[letter] !== 'correct') {
            newKeyStatuses[letter] = 'present';
        } else if (!solution.includes(letter)) {
            newKeyStatuses[letter] = 'absent';
        }
      });
      setKeyStatuses(newKeyStatuses);
      
      setCurrentGuess('');
      
      if (currentGuess === solution) {
          setGameState('won');
          setStats(prev => ({
              ...prev,
              gamesPlayed: prev.gamesPlayed + 1,
              gamesWon: prev.gamesWon + 1,
              currentStreak: prev.currentStreak + 1,
              maxStreak: Math.max(prev.maxStreak, prev.currentStreak + 1)
          }));
      } else if (newGuesses.length === MAX_GUESSES) {
          setGameState('lost');
          setStats(prev => ({
              ...prev,
              gamesPlayed: prev.gamesPlayed + 1,
              currentStreak: 0
          }));
      }
      
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(g => g.slice(0, -1));
    } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
      setCurrentGuess(g => g + key);
    }
  }, [currentGuess, gameState, guesses, keyStatuses, solution, validWords, showToast]);
  
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      let key = e.key.toUpperCase();
      if (key === 'BACKSPACE' || key === 'ENTER' || (key.length === 1 && key >= 'A' && key <= 'Z')) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleKeyPress]);

  const getHint = () => {
    if (hintUsed) {
      showToast("Hint already used for today's game.");
      return;
    }
    if (gameState !== 'playing') return;
    
    setHint(solutionDefinition);
    setHintUsed(true);
  };

  const shareResults = () => {
    const dateKey = getGameDateKey();
    const title = `SunSar ${dateKey}`;
    const result = gameState === 'won' ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    
    // Using new color scheme emoji
    const grid = guesses.map(guess => {
      return guess.split('').map((letter, i) => {
        if (solution[i] === letter) return '🟪'; // Purple for correct
        if (solution.includes(letter)) return '💠'; // Teal/Cyan for present
        return '⬛'; // Black/Gray for absent
      }).join('');
    }).join('\n');
    
    const textToCopy = `${title} ${result}\n\n${grid}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Copied to clipboard!');
    }, () => {
      showToast('Failed to copy.');
    });
  };

  return (
    <div className="flex flex-col h-full text-white p-2 sm:p-4 items-center">
      <header className="panel flex justify-between items-center p-3 rounded-lg mb-4 max-w-lg w-full">
        <button onClick={() => setShowStatsModal(true)} className="text-gray-300 hover:text-white transition-opacity">
            <StatsIcon />
        </button>
        <Logo />
        <button 
            onClick={getHint} 
            disabled={hintUsed || gameState !== 'playing'}
            className="text-gray-300 hover:text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
            <HintIcon />
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center gap-2 w-full max-w-md">
        <GameGrid guesses={guesses} currentGuess={currentGuess} solution={solution} />
        <Legend />
        {hint && (
          <div className="p-3 text-center bg-gray-900 bg-opacity-50 rounded-lg w-full mt-2">
            <p className="text-sm font-bold" style={{ color: 'var(--color-present)'}}>Hint:</p>
            <p className="italic text-gray-200 text-sm">{hint}</p>
          </div>
        )}
      </main>
      
      <footer className="flex flex-col items-center gap-4 py-2 w-full max-w-md">
        <Keyboard onKeyPress={handleKeyPress} keyStatuses={keyStatuses} />
        <div className="text-xs text-gray-500 mt-2">v{APP_VERSION}</div>
      </footer>

      <Toast message={toastMessage} show={!!toastMessage} />
      {showStatsModal && <StatsModal stats={stats} onClose={() => setShowStatsModal(false)} />}
      {showEndGameModal && (
        <EndGameModal
          gameState={gameState}
          solution={solution}
          onShare={shareResults}
        />
      )}
    </div>
  );
};

export default App;