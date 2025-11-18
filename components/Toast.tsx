import React from 'react';

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

export default Toast;