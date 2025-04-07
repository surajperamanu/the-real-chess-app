import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Socket, io } from 'socket.io-client';
import ChessTimer from './ChessTimer';
import PostGameScreen from './PostGameScreen';
import SocketService from '../services/socketService';

interface MultiplayerGameProps {
  gameId: string;
  onGameEnd: (result: string) => void;
  onReturnHome: () => void;
}

type PlayerColor = 'white' | 'black';

interface GameMove {
  from: string;
  to: string;
  promotion?: string;
}

interface ServerToClientEvents {
  gameStart: (data: { white: string; black: string; timeControl: TimeControl }) => void;
  moveMade: (data: { fen: string; move: GameMove; timeControl: { white: number; black: number } }) => void;
  gameOver: (data: { result: string }) => void;
  drawOffered: (data: { from: PlayerColor }) => void;
  drawWarning: () => void;
  drawDisabled: () => void;
  playerDisconnected: () => void;
}

interface ClientToServerEvents {
  joinRoom: (data: { gameId: string; isCreator?: boolean }, callback: (response: { error?: string; color?: PlayerColor; timeControl?: TimeControl }) => void) => void;
  move: (data: { gameId: string; move: GameMove; timeRemaining: number }) => void;
  resign: (data: { gameId: string; color: PlayerColor }) => void;
  offerDraw: (data: { gameId: string; color: PlayerColor }) => void;
  drawResponse: (data: { gameId: string; accepted: boolean }) => void;
  timeOut: (data: { gameId: string; color: PlayerColor }) => void;
}

interface TimeControl {
  initial: number;
  increment: number;
  white: number;
  black: number;
}

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ gameId, onGameEnd, onReturnHome }) => {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [status, setStatus] = useState('Connecting to game...');
  const [drawDisabled, setDrawDisabled] = useState(false);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [drawOfferFrom, setDrawOfferFrom] = useState<PlayerColor | null>(null);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [showPostGame, setShowPostGame] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const initializeSocket = () => {
      try {
        const socketService = SocketService.getInstance();
        const socket = socketService.connect();
        socketRef.current = socket;

        socket.emit('joinRoom', { gameId, isCreator: false }, (response: { 
          error?: string; 
          color?: PlayerColor; 
          timeControl?: TimeControl;
          fen?: string;
        }) => {
          if (response.error) {
            setStatus(response.error);
            setConnectionError(response.error);
            return;
          }
          setPlayerColor(response.color || null);
          setTimeControl(response.timeControl || null);
          if (response.fen) {
            setGame(new Chess(response.fen));
          }
          setStatus(`Waiting for opponent...`);
          setIsReconnecting(false);
          reconnectAttemptsRef.current = 0;
        });

        socket.on('gameStart', ({ white, black, timeControl }: { 
          white: string; 
          black: string; 
          timeControl: TimeControl 
        }) => {
          setTimeControl(timeControl);
          setStatus(`Game started - ${game.turn() === 'w' ? 'White' : 'Black'} to move`);
          setOpponentDisconnected(false);
          startTimer();
        });

        socket.on('moveMade', ({ fen, move, timeControl }: { 
          fen: string; 
          move: GameMove; 
          timeControl: { white: number; black: number } 
        }) => {
          const newGame = new Chess(fen);
          setGame(newGame);
          setTimeControl(prev => prev ? { ...prev, ...timeControl } : null);
          updateStatus(newGame);
        });

        socket.on('gameOver', ({ result }: { result: string }) => {
          setGameResult(result);
          setShowPostGame(true);
        });

        socket.on('drawOffered', ({ from }: { from: PlayerColor }) => {
          setShowDrawOffer(true);
          setDrawOfferFrom(from);
        });

        socket.on('drawWarning', () => {
          alert('Warning: One more draw offer will disable the draw button for the rest of the game');
        });

        socket.on('drawDisabled', () => {
          setDrawDisabled(true);
        });

        socket.on('playerDisconnected', ({ color }: { color: PlayerColor }) => {
          if (color !== playerColor) {
            setOpponentDisconnected(true);
            setStatus('Opponent disconnected - waiting for reconnection...');
          }
        });

        socket.on('connect_error', (error: Error) => {
          console.error('Connection error:', error);
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            setIsReconnecting(true);
            setStatus('Connection lost - attempting to reconnect...');
            reconnectTimer = setTimeout(() => {
              reconnectAttemptsRef.current++;
              socket.connect();
            }, 2000);
          } else {
            setConnectionError('Failed to connect to server after multiple attempts');
            setStatus('Connection error - please try again');
          }
        });

        socket.on('connect', () => {
          if (isReconnecting) {
            socket.emit('joinRoom', { gameId, isCreator: playerColor === 'white' }, (response: {
              error?: string;
              color?: PlayerColor;
              timeControl?: TimeControl;
              fen?: string;
            }) => {
              if (!response.error) {
                setIsReconnecting(false);
                setStatus('Reconnected to game');
                if (response.fen) {
                  setGame(new Chess(response.fen));
                }
              }
            });
          }
        });

        return () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          socketService.disconnect();
        };
      } catch (error) {
        setConnectionError(`Failed to initialize game: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setStatus('Connection error - please try again');
      }
    };

    initializeSocket();
  }, [gameId, game]);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!timeControl) return;

    timerRef.current = setInterval(() => {
      setTimeControl(prev => {
        if (!prev) return null;
        
        const currentColor = game.turn() === 'w' ? 'white' : 'black';
        const newTime = { ...prev };
        newTime[currentColor] = Math.max(0, newTime[currentColor] - 1);

        if (newTime[currentColor] <= 0) {
          if (socketRef.current && playerColor) {
            socketRef.current.emit('timeOut', { gameId, color: currentColor as PlayerColor });
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }

        return newTime;
      });
    }, 1000);
  }, [game, timeControl, socketRef, gameId, playerColor]);

  const updateStatus = useCallback((currentGame: Chess) => {
    const moveColor = currentGame.turn() === 'w' ? 'White' : 'Black';

    if (currentGame.isCheckmate()) {
      setStatus(`Game over, ${moveColor} is in checkmate.`);
    } else if (currentGame.isDraw()) {
      setStatus('Game over, drawn position');
    } else {
      setStatus(`${moveColor} to move${currentGame.isCheck() ? ', ' + moveColor + ' is in check' : ''}`);
    }
  }, []);

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!socketRef.current || !playerColor || game.turn() !== playerColor[0] || !timeControl) return false;

    try {
      const move = {
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      };

      const newGame = new Chess(game.fen());
      const result = newGame.move(move);

      if (result === null) return false;

      const currentColor = game.turn() === 'w' ? 'white' : 'black';
      socketRef.current.emit('move', { 
        gameId, 
        move,
        timeRemaining: timeControl[currentColor]
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  const handleResign = () => {
    if (socketRef.current && playerColor) {
      socketRef.current.emit('resign', { gameId, color: playerColor });
    }
  };

  const handleOfferDraw = () => {
    if (socketRef.current && playerColor && !drawDisabled) {
      socketRef.current.emit('offerDraw', { gameId, color: playerColor });
    }
  };

  const handleDrawResponse = (accept: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('drawResponse', { gameId, accepted: accept });
      setShowDrawOffer(false);
      setDrawOfferFrom(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {connectionError ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Connection Error: </strong>
          <span className="block sm:inline">{connectionError}</span>
          <button
            onClick={onReturnHome}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return to Home
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center mb-4">
          {isReconnecting && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
              Attempting to reconnect... Please wait.
            </div>
          )}

          {opponentDisconnected && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
              Opponent disconnected - waiting for reconnection...
            </div>
          )}

          {/* Timer for the opponent (top) */}
          <div className="w-full flex justify-center mb-4">
            <ChessTimer
              whiteTime={timeControl?.white || 0}
              blackTime={timeControl?.black || 0}
              isWhiteTurn={game.turn() === 'w'}
              gameStarted={!isReconnecting && !opponentDisconnected}
            />
          </div>

          {/* Game status messages */}
          {status && (
            <div className="text-xl font-semibold mb-4 text-center">
              {status}
            </div>
          )}

          {/* Chessboard */}
          <div className="mb-4">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={playerColor || 'white'}
              boardWidth={Math.min(600, window.innerWidth - 32)}
            />
          </div>

          {/* Timer for the player (bottom) */}
          <div className="w-full flex justify-center mt-4">
            <ChessTimer
              whiteTime={timeControl?.white || 0}
              blackTime={timeControl?.black || 0}
              isWhiteTurn={game.turn() === 'w'}
              gameStarted={!isReconnecting && !opponentDisconnected}
            />
          </div>

          {/* Game controls */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleResign}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              disabled={isReconnecting || opponentDisconnected}
            >
              Resign
            </button>
            <button
              onClick={handleOfferDraw}
              className={`px-4 py-2 rounded transition-colors ${
                drawDisabled || isReconnecting || opponentDisconnected
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
              disabled={drawDisabled || isReconnecting || opponentDisconnected}
            >
              {showDrawOffer ? 'Accept Draw' : drawDisabled ? 'Draw Offered' : 'Offer Draw'}
            </button>
          </div>
        </div>
      )}

      {/* Draw offer notification */}
      {showDrawOffer && !isReconnecting && !opponentDisconnected && (
        <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <p className="mb-2">Your opponent has offered a draw</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDrawResponse(true)}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Accept
            </button>
            <button
              onClick={() => handleDrawResponse(false)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {showPostGame && (
        <PostGameScreen
          result={gameResult || 'Game ended'}
          isMultiplayer={true}
          onReturnHome={onReturnHome}
        />
      )}
    </div>
  );
};

export default MultiplayerGame; 