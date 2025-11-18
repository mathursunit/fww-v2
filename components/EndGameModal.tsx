import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { GameState } from '../types';
import { getTimeToNextGame } from '../utils/dateUtils';

interface EndGameModalProps {
    gameState: GameState;
    solution: string;
    onShare: () => void;
}

const EndGameModal: React.FC<EndGameModalProps> = ({ gameState, solution, onShare }) => {
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
            <div className="text-center space-y-6 flex flex-col items-center">
                <div className="space-y-2">
                    <h2 className="text-4xl font-['Fredoka_One']" style={{ color: isWin ? '#C4B5FD' : '#E2E8F0' }}>{heading}</h2>
                    <p className="text-gray-300">{message}</p>
                </div>
                
                {!isWin && (
                    <div className="pb-2">
                        <p className="text-gray-400 text-sm">The word was:</p>
                        <p className="text-2xl font-bold tracking-widest uppercase">{solution}</p>
                    </div>
                )}
                
                <hr className="border-gray-700 w-full" />
                
                <div className="space-y-2 py-4">
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

export default EndGameModal;
