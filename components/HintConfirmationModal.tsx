
import React from 'react';

interface HintConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const HintConfirmationModal: React.FC<HintConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Use a Hint?</h2>
        <p className="text-lg mb-6">
          Using a hint will leave you with only <strong>one final attempt</strong> to guess the word. Are you sure?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg"
          >
            Yes, use hint
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
