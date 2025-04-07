import React from 'react';

interface ChessTimerProps {
  whiteTime: number;  // time in seconds
  blackTime: number;
  isWhiteTurn: boolean;
  gameStarted: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ChessTimer: React.FC<ChessTimerProps> = ({ whiteTime, blackTime, isWhiteTurn, gameStarted }) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="bg-black p-4 rounded-lg flex gap-4">
        <div className="text-center">
          <div className="bg-gray-800 p-3 rounded">
            <span className="font-mono text-3xl text-white">{formatTime(whiteTime)}</span>
          </div>
          <div className="text-white mt-2">White</div>
          <div className={`w-3 h-3 rounded-full mx-auto mt-1 ${isWhiteTurn && gameStarted ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        </div>
        <div className="text-center">
          <div className="bg-gray-800 p-3 rounded">
            <span className="font-mono text-3xl text-white">{formatTime(blackTime)}</span>
          </div>
          <div className="text-white mt-2">Black</div>
          <div className={`w-3 h-3 rounded-full mx-auto mt-1 ${!isWhiteTurn && gameStarted ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default ChessTimer; 