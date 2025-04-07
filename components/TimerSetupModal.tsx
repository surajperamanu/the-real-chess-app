import React, { useState } from 'react';

interface TimerSetupModalProps {
  onStart: (whiteTime: number, blackTime: number) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const TimerSetupModal: React.FC<TimerSetupModalProps> = ({ onStart, onCancel, isOpen }) => {
  const [whiteMinutes, setWhiteMinutes] = useState(5);
  const [whiteSeconds, setWhiteSeconds] = useState(0);
  const [blackMinutes, setBlackMinutes] = useState(5);
  const [blackSeconds, setBlackSeconds] = useState(0);

  if (!isOpen) return null;

  const handleStart = () => {
    const whiteTime = whiteMinutes * 60 + whiteSeconds;
    const blackTime = blackMinutes * 60 + blackSeconds;
    onStart(whiteTime, blackTime);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Set Timer</h2>
        
        <div className="mb-6">
          <label className="block mb-2 text-lg">White Time (MM:SS)</label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="60"
                value={whiteMinutes}
                onChange={(e) => setWhiteMinutes(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full border-2 p-3 rounded-lg text-lg"
                placeholder="Minutes"
              />
            </div>
            <span className="text-2xl">:</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                value={whiteSeconds}
                onChange={(e) => setWhiteSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full border-2 p-3 rounded-lg text-lg"
                placeholder="Seconds"
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <label className="block mb-2 text-lg">Black Time (MM:SS)</label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="60"
                value={blackMinutes}
                onChange={(e) => setBlackMinutes(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full border-2 p-3 rounded-lg text-lg"
                placeholder="Minutes"
              />
            </div>
            <span className="text-2xl">:</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                value={blackSeconds}
                onChange={(e) => setBlackSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full border-2 p-3 rounded-lg text-lg"
                placeholder="Seconds"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg text-lg font-semibold
                     hover:bg-gray-300 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex-1 bg-blue-500 text-white py-3 rounded-lg text-lg font-semibold
                     hover:bg-blue-600 transition-colors duration-200"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerSetupModal; 