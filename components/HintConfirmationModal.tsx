import React from 'react';

interface HintConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const HintConfirmationModal: React.FC<HintConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel text-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in border border-white/10">
        <div className="mb-4 text-[#FFC107] flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 drop-shadow-[0_0_10px_rgba(255,193,7,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4 font-['Fredoka_One'] tracking-wide">Use a Hint?</h2>
        <p className="text-lg mb-8 opacity-90 leading-relaxed">
          Using a hint will leave you with only <strong className="text-[#FFC107]">one final attempt</strong> to guess the word. Are you sure?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 glass-button hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#FFC107]/80 hover:bg-[#FFC107] text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg shadow-[0_0_15px_rgba(255,193,7,0.4)] border border-[#FFC107]/50"
          >
            Yes, use hint
          </button>
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