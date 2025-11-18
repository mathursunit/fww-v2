import React from 'react';
import type { GameStats } from '../types';

interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
}

const StatItem: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="flex flex-col items-center bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
    <div className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{value}</div>
    <div className="text-[10px] md:text-xs text-gray-300 uppercase tracking-wider font-semibold mt-1">{label}</div>
  </div>
);

export const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose }) => {
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel text-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl animate-fade-in relative mx-4 border border-white/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/20 rounded-full p-1"
          aria-label="Close statistics"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold mb-8 font-['Fredoka_One'] tracking-wider text-[#4FC3F7] drop-shadow-[0_0_10px_rgba(79,195,247,0.4)]">STATISTICS</h2>
        <div className="grid grid-cols-4 gap-3 text-center mb-6">
          <StatItem label="Played" value={stats.gamesPlayed} />
          <StatItem label="Win %" value={winRate} />
          <StatItem label="Streak" value={stats.currentStreak} />
          <StatItem label="Max" value={stats.maxStreak} />
        </div>
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