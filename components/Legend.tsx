import React from 'react';

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

export default Legend;
