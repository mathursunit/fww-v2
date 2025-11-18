import React from 'react';
import Modal from './Modal';
import { GameStats } from '../types';

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

export default StatsModal;
