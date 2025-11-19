import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// === From types.ts ===
type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';
type GameState = 'playing' | 'won' | 'lost';

interface KeyStatus {
  [key: string]: 'correct' | 'present' | 'absent';
}

interface SavedGameState {
    solution: string;
    guesses: string[];
    gameState: GameState;
    lastPlayed: string;
    hint?: string;
    hintUsed?: boolean;
    maxGuesses?: number;
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
}

// === From constants.ts ===
const APP_VERSION = '2.0.0';
const WORD_LENGTH = 5;
const MAX_GUESSES = 5;

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

// === From utils/dateUtils.ts ===
const getGameDateKey = (): string => {
  const etDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
   // The game day rolls over at 8 AM Eastern Time.
   if (etDate.getHours() < 8) {
    etDate.setDate(etDate.getDate() - 1);
  }
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimeToNextGame = (): number => {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const nextGameET = new Date(etNow);
  
  // Set to 8:00:00 AM ET for the next game
  nextGameET.setHours(8, 0, 0, 0);

  // If it's already past 8 AM ET today, the next game is tomorrow
  if (etNow.getHours() >= 8) {
    nextGameET.setDate(nextGameET.getDate() + 1);
  }
  
  return nextGameET.getTime() - etNow.getTime();
};

// === From services/wordService.ts ===
const useWordList = () => {
    const [wordData, setWordData] = useState({
      words: new Map<string, string>(),
      validWords: new Set<string>(),
    });
  
    useEffect(() => {
      const fetchWords = async () => {
        try {
          const response = await fetch('wordlist.csv');
          const text = await response.text();
          
          const lines = text.split('\n');
          const words = new Map<string, string>();
          const validWords = new Set<string>();
          
          for (const line of lines) {
            if (!line) continue;
            const [word, definition] = line.split(',', 2);
            if (word && word.length === WORD_LENGTH) {
              const upperWord = word.toUpperCase();
              words.set(upperWord, definition || '');
              validWords.add(upperWord);
            }
          }
          setWordData({ words, validWords });
        } catch (error) {
          console.error("Failed to load word list:", error);
        }
      };
  
      fetchWords();
    }, []);
  
    return wordData;
  };

const getWordOfTheDay = (words: Map<string, string>, dateKey: string): { solution: string, definition: string } => {
    const wordList = Array.from(words.keys());
    if (wordList.length === 0) {
        return { solution: '', definition: '' };
    }
    const date = new Date(dateKey);
    // Simple deterministic index generation based on the date
    const index = (date.getFullYear() * 365 + date.getMonth() * 31 + date.getDate()) % wordList.length;
    const solution = wordList[index];
    const definition = words.get(solution) || "No definition available.";
    return { solution, definition };
};


// === Components ===

// components/icons/StatsIcon.tsx
const StatsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// components/icons/HintIcon.tsx
const HintIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

// components/Modal.tsx
interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title }) => (
    <div
        className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
        <div
            className="panel rounded-2xl p-6 md:p-8 w-11/12 max-w-md mx-auto text-white"
            onClick={(e) => e.stopPropagation()}
        >
            {title && (
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold font-['Fredoka_One']">{title}</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-4xl leading-none -mt-2">&times;</button>
              </div>
            )}
            {children}
        </div>
    </div>
);

// components/StatsModal.tsx
interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
}

const StatsContent = ({ stats }: { stats: GameStats }) => (
    <div className="grid grid-cols-4 gap-4 text-center">
        <div>
            <div className="text-3xl font-bold">{stats.gamesPlayed}</div>
            <div className="text-xs opacity-80">Played</div>
        </div>
        <div>
            <div className="text-3xl font-bold">{stats.gamesWon}</div>
            <div className="text-xs opacity-80">Won</div>
        </div>
        <div>
            <div className="text-3xl font-bold">{stats.currentStreak}</div>
            <div className="text-xs opacity-80">Streak</div>
        </div>
        <div>
            <div className="text-3xl font-bold">{stats.maxStreak}</div>
            <div className="text-xs opacity-80">Max Streak</div>
        </div>
    </div>
);

const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose }) => (
    <Modal title="Statistics" onClose={onClose}>
        <StatsContent stats={stats} />
    </Modal>
);

// components/EndGameModal.tsx
interface EndGameModalProps {
    gameState: GameState;
    solution: string;
    solutionDefinition: string;
    stats: GameStats;
    onShare: () => void;
}

const EndGameModal: React.FC<EndGameModalProps> = ({ gameState, solution, solutionDefinition, stats, onShare }) => {
    const [timeLeft, setTimeLeft] = useState(getTimeToNextGame());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeToNextGame());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (ms: number) => {
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        const minutes = Math.floor((ms / (1000 * 60)) % 60).toString().padStart(2, '0');
        const seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    if (gameState !== 'won' && gameState !== 'lost') return null;

    const isWin = gameState === 'won';
    const heading = isWin ? 'Congratulations!' : 'Nice Try!';
    const message = isWin 
        ? 'You guessed the word correctly.' 
        : 'Better luck next time!';

    return (
        <Modal title="" onClose={() => {}}>
            <div className="text-center space-y-4 flex flex-col items-center">
                <div className="space-y-2">
                    <h2 className="text-4xl font-['Fredoka_One']" style={{ color: isWin ? '#C4B5FD' : '#E2E8F0' }}>{heading}</h2>
                    <p className="text-gray-300">{message}</p>
                </div>
                
                <div className="pb-2">
                    <p className="text-gray-400 text-sm">The word was:</p>
                    <p className="text-2xl font-bold tracking-widest uppercase">{solution}</p>
                </div>

                <div className="text-center pb-2">
                  <p className="text-sm font-semibold tracking-widest text-gray-400">DEFINITION</p>
                  <p className="italic text-gray-300 px-2">{solutionDefinition}</p>
                </div>

                <div className="w-full pt-2">
                  <StatsContent stats={stats} />
                </div>
                
                <hr className="border-gray-700 w-full" />
                
                <div className="space-y-2 py-2">
                    <p className="text-sm font-semibold tracking-widest text-gray-400">NEXT WORD IN</p>
                    <p className="text-5xl font-bold tracking-wider">{formatTime(timeLeft)}</p>
                </div>
                
                <button 
                  onClick={onShare} 
                  className="w-full btn-themed rounded-lg py-4 font-bold text-lg transition-transform hover:scale-105 active:scale-100"
                  style={{ 
                    backgroundColor: '#8B5CF6', 
                    borderColor: '#7C3AED',
                  }}
                >
                    Share Results
                </button>
            </div>
        </Modal>
    );
};

// components/Toast.tsx
interface ToastProps {
  message: string;
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, show }) => {
  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      } panel z-[60]`}
      aria-live="assertive"
    >
      {message}
    </div>
  );
};

// components/Logo.tsx
const Logo: React.FC = () => (
  <div className="flex flex-col items-center select-none">
    <div className="flex items-center justify-center">
      <h1 className="text-4xl font-['Fredoka_One'] tracking-wide">
        <span style={{ color: '#FBBF24' }}>Sun</span>
        <span style={{ color: '#60A5FA' }}>Sar</span>
      </h1>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1 -mt-1 animate-spin-slow">
        <circle cx="12" cy="12" r="5" fill="#FBBF24"/>
        <line x1="12" y1="1" x2="12" y2="4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="20" x2="12" y2="23" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="1" y1="12" x2="4" y2="12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="12" x2="23" y2="12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    <p className="text-xs font-semibold text-gray-400 tracking-wider -mt-1">Fun with words</p>
  </div>
);

// components/Legend.tsx
const Legend: React.FC = () => (
  <div className="flex justify-center items-center gap-x-4 sm:gap-x-6 text-xs text-gray-400 my-2">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-correct)' }}></div>
      <span>Correct</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-present)' }}></div>
      <span>Present</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-absent)' }}></div>
      <span>Absent</span>
    </div>
  </div>
);


// components/GameGrid.tsx
interface GameGridProps {
  guesses: string[];
  currentGuess: string;
  solution: string;
  isInvalidGuess: boolean;
}

const GameGrid: React.FC<GameGridProps> = ({ guesses, currentGuess, solution, isInvalidGuess }) => {
  
  const getStatusForLetter = (letter: string, index: number, guess: string): LetterStatus => {
    if (!solution) return 'empty';
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
            const isCurrentGuessRow = rowIndex === guesses.length;
            const guess = isSubmittedRow ? guesses[rowIndex] : (isCurrentGuessRow ? currentGuess : '');
            const letter = guess[colIndex] || '';
            const status = isSubmittedRow ? getStatusForLetter(letter, colIndex, guesses[rowIndex]) : 'empty';
            const style = isSubmittedRow ? { transitionDelay: `${colIndex * 100}ms` } : {};
            const invalidClass = isCurrentGuessRow && isInvalidGuess ? 'animate-shake !border-red-500' : '';
            
            return (
              <div 
                key={colIndex} 
                style={style} 
                className={`${getTileClass(status, letter)} ${isSubmittedRow ? 'animate-flip' : ''} ${invalidClass}`}
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

// components/Keyboard.tsx
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


// === From App.tsx ===
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
  const [isInvalidGuess, setIsInvalidGuess] = useState<boolean>(false);
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
    setIsInvalidGuess(false);

    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        showToast('Not enough letters');
        return;
      }
      if (guesses.includes(currentGuess)) {
        showToast('Already guessed');
        return;
      }
      if (!validWords.has(currentGuess)) {
        showToast('Not in word list');
        setIsInvalidGuess(true);
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
        <GameGrid guesses={guesses} currentGuess={currentGuess} solution={solution} isInvalidGuess={isInvalidGuess} />
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
          solutionDefinition={solutionDefinition}
          stats={stats}
          onShare={shareResults}
        />
      )}
    </div>
  );
};


// === Initial Render ===
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);