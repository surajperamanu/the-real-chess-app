import React, { useState } from 'react';
import TimerSetupModal from './TimerSetupModal';
import SocketService from '../services/socketService';

interface HomeScreenProps {
  onNewGame: (mode: 'solo' | 'two-player' | 'multiplayer') => void;
  onJoinMultiplayer: (gameId: string) => void;
  onCreateMultiplayer: () => void;
  gameResult?: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onNewGame,
  onJoinMultiplayer,
  onCreateMultiplayer,
  gameResult
}) => {
  const [joinGameId, setJoinGameId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [showTimerSetup, setShowTimerSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateGame = () => {
    setShowTimerSetup(true);
    setError(null);
  };

  const handleTimerStart = async (whiteSeconds: number, blackSeconds: number) => {
    try {
      setCreatedGameId('Creating game...');
      const socketService = SocketService.getInstance();
      const socket = socketService.connect();

      socket.emit('createRoom', { 
        timeControl: {
          initial: whiteSeconds,
          increment: 0,
          white: whiteSeconds,
          black: blackSeconds
        }
      }, (response: { gameId: string; error?: string }) => {
        if (response.error) {
          setError(response.error);
          setCreatedGameId(null);
          return;
        }
        if (response.gameId) {
          setCreatedGameId(response.gameId);
          setShowTimerSetup(false);
        } else {
          setError('Failed to create game. Please try again.');
          setCreatedGameId(null);
        }
      });
    } catch (error) {
      setError('Connection error. Please try again.');
      setCreatedGameId(null);
      setShowTimerSetup(false);
    }
  };

  const handleTimerCancel = () => {
    setShowTimerSetup(false);
    setError(null);
  };

  const handleJoinCreatedGame = (gameId: string) => {
    const socketService = SocketService.getInstance();
    const socket = socketService.connect();
    
    socket.emit('joinRoom', { gameId, isCreator: true }, (response: { error?: string }) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      onJoinMultiplayer(gameId);
      setCreatedGameId(null);
    });
  };

  const handleJoinGame = () => {
    const socketService = SocketService.getInstance();
    const socket = socketService.connect();
    
    socket.emit('joinRoom', { gameId: joinGameId, isCreator: false }, (response: { error?: string }) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      onJoinMultiplayer(joinGameId);
      setShowJoinInput(false);
      setJoinGameId('');
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <TimerSetupModal 
        isOpen={showTimerSetup} 
        onStart={handleTimerStart}
        onCancel={handleTimerCancel}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!showTimerSetup && (
        <>
          {gameResult && (
            <div className="text-2xl font-bold mb-8 animate-fade-in">
              {gameResult}
            </div>
          )}

          {!createdGameId && (
            <div className="flex flex-col gap-4 w-64">
              <button
                onClick={() => onNewGame('solo')}
                className="px-8 py-4 bg-gray-800 text-white text-xl font-semibold rounded-lg 
                         hover:bg-gray-700 transition-colors duration-200 shadow-lg
                         transform hover:scale-105 transition-transform"
              >
                Solo Play with Analysis
              </button>
              <button
                onClick={handleCreateGame}
                className="px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg 
                         hover:bg-green-700 transition-colors duration-200 shadow-lg
                         transform hover:scale-105 transition-transform"
              >
                Create Online Game
              </button>
              <button
                onClick={() => setShowJoinInput(true)}
                className="px-8 py-4 bg-purple-600 text-white text-xl font-semibold rounded-lg 
                         hover:bg-purple-700 transition-colors duration-200 shadow-lg
                         transform hover:scale-105 transition-transform"
              >
                Join Online Game
              </button>
            </div>
          )}

          {createdGameId && createdGameId !== 'Creating game...' && (
            <div className="mb-8 p-4 bg-white rounded-lg shadow-lg animate-fade-in">
              <h3 className="text-xl font-semibold mb-2">Game Created!</h3>
              <p className="mb-2">Share this ID with your opponent:</p>
              <div className="bg-gray-100 p-3 rounded-lg text-2xl font-mono text-center select-all">
                {createdGameId}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleJoinCreatedGame(createdGameId)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Join Game
                </button>
                <button
                  onClick={() => setCreatedGameId(null)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Create New Game
                </button>
              </div>
            </div>
          )}

          {showJoinInput && !createdGameId && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg animate-fade-in">
              <input
                type="text"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
                placeholder="Enter Game ID"
                className="w-full px-4 py-2 mb-2 border rounded-lg text-lg"
                maxLength={6}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoinGame}
                  disabled={!joinGameId}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg
                           hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Join
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false);
                    setJoinGameId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomeScreen; 