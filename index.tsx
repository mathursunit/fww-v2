import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- START: Inlined Project Files ---

// === types.ts ===
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

// === constants.ts ===
const WORD_LENGTH = 5;
const MAX_GUESSES = 5;
const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

// === utils/dateUtils.ts ===
const getGameDateKey = (): string => {
  const etDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
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
  nextGameET.setHours(8, 0, 0, 0);
  if (etNow.getHours() >= 8) {
    nextGameET.setDate(nextGameET.getDate() + 1);
  }
  return nextGameET.getTime() - etNow.getTime();
};

// === services/geminiService.ts ===
const FALLBACK_WORDS = ['REACT', 'WORLD', 'HELLO', 'GREAT', 'PARTY', 'HOUSE', 'CHAIR', 'MUSIC', 'WATER', 'EARTH'];
let ai: GoogleGenAI | null = null;
const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.warn("API_KEY environment variable not set. Using fallback words.");
            return null;
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}
const selectDeterministicFallback = (dateKey: string): string => {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
        const char = dateKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const index = Math.abs(hash) % FALLBACK_WORDS.length;
    return FALLBACK_WORDS[index];
}
const getWordHint = async (word: string): Promise<string> => {
    const genAI = getAi();
    if (!genAI) {
        return "Sorry, the hint service is unavailable right now.";
    }
    try {
        const prompt = `Generate a short, cryptic, puzzle-like hint for the 5-letter word "${word.toUpperCase()}". The hint should be a single sentence and must not include the word itself or any of its letters. For example, for 'CLOCK', a good hint is 'I have a face but no eyes, and hands but no arms.'`;
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const hint = response.text?.trim();
        if (hint) {
            return hint;
        } else {
            console.error("Gemini did not return a valid hint, using fallback.", response.text);
            return "A mysterious force prevents a hint from appearing.";
        }
    } catch (error) {
        console.error("Error fetching hint from Gemini API:", error);
        return "A mysterious force prevents a hint from appearing.";
    }
};
const getGameDataOfTheDay = async (): Promise<{ word: string, hint: string }> => {
    const dateKey = getGameDateKey();
    const genAI = getAi();
    if (!genAI) {
        const word = selectDeterministicFallback(dateKey);
        const hint = await getWordHint(word);
        return { word, hint };
    }
    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `For the date ${dateKey}, generate a single, common, 5-letter English word in lowercase. This must be the same word every time for the same date. Also, generate a short, cryptic, puzzle-like hint for this word. The hint should be a single sentence and must not include the word itself or any of its letters. For example, for 'CLOCK', a good hint is 'I have a face but no eyes, and hands but no arms.'`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING, description: "A 5-letter common English word in lowercase." },
                        hint: { type: Type.STRING, description: "A cryptic hint for the word." }
                    }
                }
            }
        });
        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty response from Gemini");
        const data = JSON.parse(jsonStr);
        const { word, hint } = data;
        if (word && word.length === 5 && /^[a-z]{5}$/.test(word) && hint) {
            return { word, hint };
        } else {
            console.error("Gemini did not return valid data, using fallback. Response:", data);
            const fallbackWord = selectDeterministicFallback(dateKey);
            const fallbackHint = await getWordHint(fallbackWord);
            return { word: fallbackWord, hint: fallbackHint };
        }
    } catch (error) {
        console.error("Error fetching game data from Gemini API:", error);
        const fallbackWord = selectDeterministicFallback(dateKey);
        const fallbackHint = await getWordHint(fallbackWord);
        return { word: fallbackWord, hint: fallbackHint };
    }
};

// === components/GameGrid.tsx ===
interface GameGridProps {
  guesses: string[]; currentGuess: string; solution: string;
  shakeRowIndex: number | null; maxGuesses: number;
}
interface TileProps { letter: string; status: LetterStatus; isRevealed: boolean; index: number; }
const getTileStatus = (letter: string, index: number, solution: string): LetterStatus => {
    if (solution[index] === letter) return 'correct';
    if (solution.includes(letter)) return 'present';
    return 'absent';
};
const Tile: React.FC<TileProps> = ({ letter, status, isRevealed, index }) => {
  const statusClasses = {
    correct: 'bg-violet-500/60 border-violet-400/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]',
    present: 'bg-cyan-500/60 border-cyan-400/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]',
    absent: 'bg-slate-700/60 border-slate-600/50 text-white/80',
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
      <div className={flipperClasses} style={{ transitionDelay: animationDelay }}>
        <div className={`${faceClasses} ${frontStyle}`}>{letter}</div>
        <div className={`${faceClasses} [transform:rotateX(180deg)] ${backStyle}`}>{letter}</div>
      </div>
    </div>
  );
};
interface RowProps {
    guess?: string; currentGuess?: string; solution?: string;
    isCompleted?: boolean; isShaking?: boolean;
}
const Row: React.FC<RowProps> = ({ guess, currentGuess, solution, isCompleted, isShaking }) => {
    const letters = (guess || currentGuess || '').padEnd(WORD_LENGTH, ' ').split('');
    return (
        <div className={`grid grid-cols-5 gap-2 ${isShaking ? 'animate-shake' : ''}`}>
            {letters.map((letter, i) => (
                <Tile key={i} letter={letter} status={isCompleted && guess && solution ? getTileStatus(letter, i, solution) : "empty"} isRevealed={!!isCompleted} index={i} />
            ))}
        </div>
    );
}
const GameGrid: React.FC<GameGridProps> = ({ guesses, currentGuess, solution, shakeRowIndex, maxGuesses }) => {
  const emptyRows = Array(Math.max(0, maxGuesses - guesses.length - 1)).fill(null);
  return (
    <div className="grid grid-rows-5 gap-2 p-2">
      {guesses.map((guess, i) => ( <Row key={i} guess={guess} solution={solution} isCompleted /> ))}
      {guesses.length < maxGuesses && ( <Row currentGuess={currentGuess} isShaking={shakeRowIndex === guesses.length} /> )}
      {emptyRows.map((_, i) => ( <Row key={i + guesses.length + 1} /> ))}
      <style>{`@keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } } .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; } .font-fredoka { font-family: 'Fredoka One', cursive; }`}</style>
    </div>
  );
};

// === components/Keyboard.tsx ===
interface KeyboardProps { onKeyInput: (key: string) => void; keyStatuses: KeyStatus; }
interface KeyProps { value: string; status?: 'correct' | 'present' | 'absent'; onClick: (value: string) => void; }
const Key: React.FC<KeyProps> = ({ value, status, onClick }) => {
    const statusClasses = {
        correct: 'bg-violet-500/60 border-violet-400/50 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]',
        present: 'bg-cyan-500/60 border-cyan-400/50 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]',
        absent: 'bg-slate-700/60 border-slate-600/50 text-white/50',
        default: 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30',
    };
    const isSpecialKey = value === 'ENTER' || value === 'BACKSPACE';
    const baseClasses = `h-14 rounded-lg font-bold uppercase flex items-center justify-center transition-all duration-200 cursor-pointer select-none backdrop-blur-sm border shadow-sm active:scale-95`;
    const widthClasses = isSpecialKey ? 'px-2 text-xs md:text-sm flex-grow-[1.5]' : 'flex-1 text-sm md:text-base';
    return (
        <button className={`${baseClasses} ${widthClasses} ${status ? statusClasses[status] : statusClasses.default}`} onClick={() => onClick(value)}>
            {value === 'BACKSPACE' ? ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" /></svg> ) : value}
        </button>
    )
}
const Keyboard: React.FC<KeyboardProps> = ({ onKeyInput, keyStatuses }) => (
    <div className="space-y-2 w-full">
      {KEYBOARD_LAYOUT.map((row, i) => (
        <div key={i} className="flex justify-center space-x-1.5 w-full">
          {row.map((key) => ( <Key key={key} value={key} status={keyStatuses[key]} onClick={onKeyInput} /> ))}
        </div>
      ))}
    </div>
);

// === components/MessageModal.tsx ===
interface CountdownTimerProps { targetTime: number; }
const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());
  useEffect(() => {
    if (targetTime <= 0) return;
    const timer = setInterval(() => {
      const remaining = targetTime - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);
  if (timeLeft <= 0) return (<div className="text-white/90"><h3 className="text-lg font-semibold mb-1">Next Word Available!</h3><p className="text-sm opacity-80">Refresh to play.</p></div>);
  const hours = String(Math.floor(timeLeft / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((timeLeft / 60000) % 60)).padStart(2, '0');
  const seconds = String(Math.floor((timeLeft / 1000) % 60)).padStart(2, '0');
  return (<div className="text-white"><h3 className="text-sm font-semibold uppercase tracking-widest mb-2 opacity-70">Next Word In</h3><div className="text-4xl font-mono font-bold tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"><span>{hours}</span>:<span>{minutes}</span>:<span>{seconds}</span></div></div>);
};
interface MessageModalProps {
  gameState: GameState; solution: string; guesses: string[];
  maxGuesses: number; nextGameTime: number; onShare: () => void;
}
const MessageModal: React.FC<MessageModalProps> = ({ gameState, solution, guesses, maxGuesses, nextGameTime, onShare }) => {
  if (gameState === 'playing') return null;
  const isWin = gameState === 'won';
  const handleShare = () => {
    const gameDateKey = new Date().toLocaleDateString('en-CA');
    const title = `SanSar ${gameDateKey} ${isWin ? guesses.length : 'X'}/${maxGuesses}`;
    const emojiGrid = guesses.map(guess => guess.split('').map((letter, i) => (solution[i] === letter) ? '🟪' : solution.includes(letter) ? '🟦' : '⬛').join('')).join('\n');
    navigator.clipboard.writeText(`${title}\n\n${emojiGrid}`).then(onShare);
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in border border-white/10">
        <h2 className={`text-3xl font-bold mb-2 font-['Fredoka_One'] tracking-wide ${isWin ? 'text-violet-400' : 'text-white'}`}>{isWin ? "Congratulations!" : "So Close!"}</h2>
        <p className="text-lg mb-2 text-white/80">{isWin ? "You guessed the word correctly." : `The word was:`}</p>
        {!isWin && <p className="text-4xl font-bold text-[#4FC3F7] mb-6 tracking-widest drop-shadow-[0_0_10px_rgba(79,195,247,0.5)]">{solution}</p>}
        <div className="mt-6 border-t border-white/10 pt-6"><CountdownTimer targetTime={nextGameTime} /></div>
        <button onClick={handleShare} className="mt-8 w-full bg-violet-500/80 hover:bg-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-violet-400/30 backdrop-blur-md hover:scale-[1.02]">Share Results</button>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }`}</style>
    </div>
  );
};

// === components/HintConfirmationModal.tsx ===
interface HintConfirmationModalProps { onConfirm: () => void; onCancel: () => void; }
const HintConfirmationModal: React.FC<HintConfirmationModalProps> = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel text-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in border border-white/10">
        <div className="mb-4 text-[#FFC107] flex justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 drop-shadow-[0_0_10px_rgba(255,193,7,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
        <h2 className="text-2xl font-bold mb-4 font-['Fredoka_One'] tracking-wide">Use a Hint?</h2>
        <p className="text-lg mb-8 opacity-90 leading-relaxed">Using a hint will leave you with only <strong className="text-[#FFC107]">one final attempt</strong> to guess the word. Are you sure?</p>
        <div className="flex justify-center space-x-4">
          <button onClick={onCancel} className="flex-1 glass-button hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-[#FFC107]/80 hover:bg-[#FFC107] text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg shadow-[0_0_15px_rgba(255,193,7,0.4)] border border-[#FFC107]/50">Yes, use hint</button>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }`}</style>
    </div>
);

// === components/StatsModal.tsx ===
interface StatsModalProps { stats: GameStats; onClose: () => void; }
const StatItem: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="flex flex-col items-center bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
    <div className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{value}</div>
    <div className="text-[10px] md:text-xs text-gray-300 uppercase tracking-wider font-semibold mt-1">{label}</div>
  </div>
);
const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose }) => {
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel text-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl animate-fade-in relative mx-4 border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/20 rounded-full p-1" aria-label="Close statistics"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        <h2 className="text-2xl font-bold mb-8 font-['Fredoka_One'] tracking-wider text-[#4FC3F7] drop-shadow-[0_0_10px_rgba(79,195,247,0.4)]">STATISTICS</h2>
        <div className="grid grid-cols-4 gap-3 text-center mb-6">
          <StatItem label="Played" value={stats.gamesPlayed} /><StatItem label="Win %" value={winRate} /><StatItem label="Streak" value={stats.currentStreak} /><StatItem label="Max" value={stats.maxStreak} />
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }`}</style>
    </div>
  );
};

// === components/Legend.tsx ===
const Legend: React.FC = () => (
  <div className="flex justify-center items-center space-x-6 my-4 text-sm text-white/80 animate-fade-in">
    <div className="flex items-center space-x-2">
      <div className="w-5 h-5 rounded-md bg-violet-500/60 border-2 border-violet-400/50"></div>
      <span>Correct</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-5 h-5 rounded-md bg-cyan-500/60 border-2 border-cyan-400/50"></div>
      <span>Present</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-5 h-5 rounded-md bg-slate-700/60 border-2 border-slate-600/50"></div>
      <span>Absent</span>
    </div>
  </div>
);


// === App.tsx ===
declare global {
  interface Window { confetti?: any; }
}
const App: React.FC = () => {
  const [solution, setSolution] = useState<string>('');
  const [solutionHint, setSolutionHint] = useState<string>('');
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
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (confettiCanvasRef.current && window.confetti && !confettiInstanceRef.current) {
        confettiInstanceRef.current = window.confetti.create(confettiCanvasRef.current, { resize: true, useWorker: true });
    }
  }, []);

  useEffect(() => {
    const initializeGame = async () => {
      const gameDateKey = getGameDateKey();
      const savedStateString = localStorage.getItem('gameState');
      const savedStatsString = localStorage.getItem('gameStats');
      let savedState: SavedGameState | null = null;
      if (savedStatsString) setStats(JSON.parse(savedStatsString));
      if (savedStateString) try { savedState = JSON.parse(savedStateString); } catch (e) { console.error("Failed to parse saved state", e); localStorage.removeItem('gameState'); }
      if (savedState && savedState.lastPlayed === gameDateKey) {
        setSolution(savedState.solution);
        setGuesses(savedState.guesses);
        setGameState(savedState.gameState);
        setHintUsed(savedState.hintUsed ?? false);
        setMaxGuesses(savedState.maxGuesses ?? MAX_GUESSES);
        const hintToSet = savedState.hint || await getWordHint(savedState.solution);
        setSolutionHint(hintToSet);
        if (savedState.hintUsed) setHintText(hintToSet);
        const newKeyStatuses: KeyStatus = {};
        savedState.guesses.forEach(guess => {
            guess.split('').forEach((letter, index) => {
                if (savedState!.solution[index] === letter) newKeyStatuses[letter] = 'correct';
                else if (savedState!.solution.includes(letter) && newKeyStatuses[letter] !== 'correct') newKeyStatuses[letter] = 'present';
                else newKeyStatuses[letter] = 'absent';
            });
        });
        setKeyStatuses(newKeyStatuses);
      } else {
        setLoadingMessage("Loading today's word and hint...");
        const { word: newWord, hint: newHint } = await getGameDataOfTheDay();
        setSolution(newWord.toUpperCase());
        setSolutionHint(newHint);
        setGuesses([]);
        setGameState('playing');
        setKeyStatuses({});
        setHintUsed(false);
        setMaxGuesses(MAX_GUESSES);
        setHintText('');
      }
      setNextGameTime(Date.now() + getTimeToNextGame());
      setIsInitialized(true);
      setIsLoading(false);
    };
    initializeGame();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('gameState', JSON.stringify({ solution, guesses, gameState, lastPlayed: getGameDateKey(), hint: solutionHint, hintUsed, maxGuesses }));
  }, [guesses, gameState, solution, isInitialized, solutionHint, hintUsed, maxGuesses]);
  
  useEffect(() => {
    if (gameState === 'won' && confettiInstanceRef.current) {
      const confetti = confettiInstanceRef.current;
      const end = Date.now() + 3000;
      (function frame() {
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#a78bfa', '#818cf8', '#c084fc'] });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#a78bfa', '#818cf8', '#c084fc'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }
  }, [gameState]);

  useEffect(() => {
    if (!isInitialized || gameState === 'playing') return;
    const gameDateKey = getGameDateKey();
    if (gameDateKey !== localStorage.getItem('lastStatUpdate')) {
      const didWin = gameState === 'won';
      setStats(prev => {
        const newStats = { ...prev, gamesPlayed: prev.gamesPlayed + 1, gamesWon: didWin ? prev.gamesWon + 1 : prev.gamesWon, currentStreak: didWin ? prev.currentStreak + 1 : 0 };
        newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
        localStorage.setItem('gameStats', JSON.stringify(newStats));
        localStorage.setItem('lastStatUpdate', gameDateKey);
        return newStats;
      });
    }
  }, [gameState, isInitialized]);

  const handleMessage = (msg: string, duration: number = 2000) => { setMessage(msg); setTimeout(() => setMessage(''), duration); };
  const shakeCurrentRow = () => { setShakeRowIndex(guesses.length); setTimeout(() => setShakeRowIndex(null), 500); };
  
  const handleSubmit = () => {
    if (gameState !== 'playing' || currentGuess.length !== WORD_LENGTH) {
      if(gameState === 'playing') {
        handleMessage('Not enough letters');
        shakeCurrentRow();
      }
      return;
    }
    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    const newKeyStatuses = { ...keyStatuses };
    currentGuess.split('').forEach((letter, index) => {
      if (solution[index] === letter) newKeyStatuses[letter] = 'correct';
      else if (solution.includes(letter) && newKeyStatuses[letter] !== 'correct') newKeyStatuses[letter] = 'present';
      else newKeyStatuses[letter] = 'absent';
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
    if (key === 'ENTER') handleSubmit();
    else if (key === 'BACKSPACE') setCurrentGuess(p => p.slice(0, -1));
    else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) setCurrentGuess(p => p + key);
  };
  
  const handleHint = () => { if (!hintUsed && gameState === 'playing') setIsHintModalOpen(true); };
  const handleConfirmHint = () => {
    setIsHintModalOpen(false);
    if (hintUsed || gameState !== 'playing') return;
    setHintText(solutionHint);
    setHintUsed(true);
    setMaxGuesses(guesses.length + 1);
    handleMessage('Hint revealed! You have one guess left.');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLoading || gameState !== 'playing') return;
      let key = event.key.toUpperCase();
      if (key === 'BACKSPACE' || key === 'ENTER' || (key.length === 1 && key >= 'A' && key <= 'Z')) handleKeyInput(key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameState, isLoading]);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-2 md:p-4 text-center overflow-hidden">
      <canvas ref={confettiCanvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999]" />
      <header className="w-full max-w-md mx-auto relative mb-2 px-4 py-3 rounded-2xl glass-panel flex items-center justify-between">
        <div className="flex-1 flex justify-start"><button onClick={() => setIsStatsModalOpen(true)} className="p-2 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-full" aria-label="Show statistics"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></button></div>
        <div className="flex flex-col items-center justify-center">
            <div className="flex items-center relative"><span className="font-['Fredoka_One'] text-4xl md:text-5xl text-[#FFC107] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Sun</span><span className="font-['Fredoka_One'] text-4xl md:text-5xl text-[#4FC3F7] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Sar</span><div className="ml-1 animate-[spin_12s_linear_infinite]"><svg width="32" height="32" viewBox="0 0 24 24" fill="#FFC107" className="drop-shadow-md"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" /><path d="M9 13c1.5 1.5 4.5 1.5 6 0" stroke="#B36B00" strokeWidth="1.5" strokeLinecap="round" fill="none" /><circle cx="9" cy="10" r="0.8" fill="#B36B00" /><circle cx="15" cy="10" r="0.8" fill="#B36B00" /></svg></div></div>
            <p className="font-['Nunito'] text-sm md:text-base text-gray-300 tracking-widest font-semibold -mt-1">Fun with words</p>
        </div>
        <div className="flex-1 flex justify-end"><button onClick={handleHint} disabled={hintUsed || gameState !== 'playing'} className="p-2 text-white/70 hover:text-white disabled:text-white/20 disabled:cursor-not-allowed transition-colors hover:bg-white/10 rounded-full" aria-label="Get a hint"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></button></div>
      </header>
      <div className="h-8 text-center my-1 text-lg font-bold text-white drop-shadow-md">{message}</div>
      <main className="flex-grow flex flex-col justify-center w-full max-w-md mx-auto">
        {isLoading ? ( <div className="flex flex-col items-center justify-center space-y-4"><div className="w-12 h-12 border-4 border-white/20 border-t-[#4FC3F7] rounded-full animate-spin"></div><div className="text-xl font-nunito font-semibold tracking-wide">{loadingMessage}</div></div> ) : (
          <><GameGrid guesses={guesses} currentGuess={currentGuess} solution={solution} shakeRowIndex={shakeRowIndex} maxGuesses={maxGuesses} />
            <Legend />
            {hintText && (<div className="mt-6 p-4 glass-panel rounded-xl text-lg text-[#FFC107] italic animate-fade-in shadow-[0_0_15px_rgba(255,193,7,0.2)] border-l-4 border-l-[#FFC107]"><strong className="block text-xs uppercase tracking-widest opacity-80 not-italic mb-1">AI Hint</strong>{hintText}</div>)}</>
        )}
      </main>
      <div className="w-full max-w-lg mx-auto p-2 mt-4"><Keyboard onKeyInput={handleKeyInput} keyStatuses={keyStatuses} /></div>
      {(gameState === 'won' || gameState === 'lost') && ( <MessageModal gameState={gameState} solution={solution} guesses={guesses} maxGuesses={maxGuesses} nextGameTime={nextGameTime} onShare={() => handleMessage('Results copied to clipboard!')} /> )}
      {isHintModalOpen && ( <HintConfirmationModal onConfirm={handleConfirmHint} onCancel={() => setIsHintModalOpen(false)} /> )}
      {isStatsModalOpen && ( <StatsModal stats={stats} onClose={() => setIsStatsModalOpen(false)} /> )}
      <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="fixed bottom-2 right-2 text-xs text-white/20 font-mono select-none" aria-hidden="true">v1.6</div>
    </div>
  );
};

// --- END: Inlined Project Files ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);