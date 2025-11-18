import React from 'react';

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

export default Modal;