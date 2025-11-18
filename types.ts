export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

export type GameState = 'playing' | 'won' | 'lost';

export interface KeyStatus {
  [key: string]: 'correct' | 'present' | 'absent';
}

export interface SavedGameState {
    solution: string;
    guesses: string[];
    gameState: GameState;
    lastPlayed: string;
    hint?: string;
    hintUsed?: boolean;
    maxGuesses?: number;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
}