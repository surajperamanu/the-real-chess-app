"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Chessboard } from "react-chessboard"
import { Chess } from "chess.js"
import ChessTimer from "./ChessTimer"
import TimerSetupModal from "./TimerSetupModal"
import HomeScreen from "./HomeScreen"
import StockfishAnalysis from "./StockfishAnalysis"
import StockfishSettings from "./StockfishSettings"
import MultiplayerGame from "./MultiplayerGame"
import PostGameScreen from './PostGameScreen'
import SocketService from '../services/socketService'

interface ChessGameProps {}

type GameState = 'home' | 'setup' | 'playing' | 'ended';
type GameMode = 'solo' | 'two-player' | 'multiplayer';

const ChessGame: React.FC<ChessGameProps> = () => {
  const [game, setGame] = useState(new Chess())
  const [status, setStatus] = useState("")
  const [gameState, setGameState] = useState<GameState>('home')
  const [gameMode, setGameMode] = useState<GameMode>('solo')
  const [gameResult, setGameResult] = useState<string>("")
  const [whiteTime, setWhiteTime] = useState(300) // 5 minutes default
  const [blackTime, setBlackTime] = useState(300)
  const [stockfishEnabled, setStockfishEnabled] = useState(false)
  const [stockfishDepth, setStockfishDepth] = useState(5)
  const [multiplayerGameId, setMultiplayerGameId] = useState<string>("")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showPostGame, setShowPostGame] = useState(false)
  const [stockfishAnalysis, setStockfishAnalysis] = useState<string>('')

  const resetGame = useCallback(() => {
    setGame(new Chess())
    setStatus("")
    setShowPostGame(false)
    setStockfishAnalysis('')
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current)
    }
  }, [])

  const updateStatus = useCallback(() => {
    let status = ""
    const moveColor = game.turn() === "w" ? "White" : "Black"
    const currentTime = game.turn() === "w" ? whiteTime : blackTime
    const timeStr = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`

    if (game.isCheckmate()) {
      status = `Game over, ${moveColor} is in checkmate.`
      const result = `${moveColor === "White" ? "Black" : "White"} wins by checkmate!`
      setGameResult(result)
      setShowPostGame(true)
      setGameState('ended')
    } else if (game.isDraw()) {
      status = "Game over, drawn position"
      setGameResult("Game drawn!")
      setShowPostGame(true)
      setGameState('ended')
    } else {
      status = `${moveColor} to move (${timeStr} remaining)`
      if (game.isCheck()) {
        status += `, ${moveColor} is in check`
      }
    }

    setStatus(status)
  }, [game, whiteTime, blackTime])

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current!)
            setStatus("Game over, Black wins on time")
            setGameResult("Black wins on time!")
            setShowPostGame(true)
            setGameState('ended')
            return 0
          }
          return prev - 1
        })
      } else {
        setBlackTime((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current!)
            setStatus("Game over, White wins on time")
            setGameResult("White wins on time!")
            setShowPostGame(true)
            setGameState('ended')
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)
  }, [game])

  useEffect(() => {
    if (gameState === 'playing' && gameMode !== 'multiplayer') {
      startTimer()
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState, game.turn(), startTimer, gameMode])

  const handleNewGame = (mode: GameMode) => {
    setGameMode(mode)
    if (mode === 'multiplayer') {
      setGameState('home')
    } else {
      resetGame()
      setGameState('setup')
      if (mode === 'solo') {
        setStockfishEnabled(true)
      } else {
        setStockfishEnabled(false)
      }
    }
  }

  const handleCreateMultiplayer = () => {
    try {
      const socketService = SocketService.getInstance();
      const socket = socketService.connect();
      
      socket.emit('createRoom', { 
        timeControl: {
          initial: 300, // Default 5 minutes
          increment: 0,
          white: 300,
          black: 300
        }
      }, (response: { gameId: string; error?: string }) => {
        if (response.error) {
          console.error('Failed to create game:', response.error);
          return;
        }
        setMultiplayerGameId(response.gameId);
        setGameMode('multiplayer');
        setGameState('playing');
      });
    } catch (error) {
      console.error('Failed to create multiplayer game:', error);
    }
  };

  const handleJoinMultiplayer = (gameId: string) => {
    try {
      const socketService = SocketService.getInstance();
      const socket = socketService.connect();
      
      socket.emit('joinRoom', { gameId, isCreator: false }, (response: { error?: string }) => {
        if (response.error) {
          console.error('Failed to join game:', response.error);
          return;
        }
        setMultiplayerGameId(gameId);
        setGameMode('multiplayer');
        setGameState('playing');
      });
    } catch (error) {
      console.error('Failed to join multiplayer game:', error);
    }
  };

  const handleMultiplayerGameEnd = (result: string) => {
    if (result) {
      setGameResult(result);
      setGameState('ended');
      setShowPostGame(true);
      
      // Clean up socket connection
      const socketService = SocketService.getInstance();
      socketService.disconnect();
    } else {
      handleReturnHome();
    }
  };

  const handleReturnHome = () => {
    setGameState('home');
    setGameMode('solo');
    setMultiplayerGameId("");
    resetGame();
    
    // Clean up socket connection
    const socketService = SocketService.getInstance();
    socketService.disconnect();
  };

  const handleTimerStart = (whiteSeconds: number, blackSeconds: number) => {
    setWhiteTime(whiteSeconds)
    setBlackTime(blackSeconds)
    setGameState('playing')
  }

  const handleTimerCancel = () => {
    setGameState('home')
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to queen for simplicity
      })

      if (move === null) return false // illegal move
      
      setGame(new Chess(game.fen()))
      startTimer()
      updateStatus()
      return true
    } catch (error) {
      return false
    }
  }

  if (gameState === 'home') {
    return (
      <HomeScreen 
        onNewGame={handleNewGame}
        onCreateMultiplayer={handleCreateMultiplayer}
        onJoinMultiplayer={handleJoinMultiplayer}
        gameResult={gameResult}
      />
    )
  }

  if (gameMode === 'multiplayer' && gameState === 'playing') {
    return (
      <MultiplayerGame
        gameId={multiplayerGameId}
        onGameEnd={handleMultiplayerGameEnd}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <TimerSetupModal 
        isOpen={gameState === 'setup'} 
        onStart={handleTimerStart}
        onCancel={handleTimerCancel}
      />
      
      {gameState !== 'setup' && !showPostGame && (
        <div className="p-8 bg-white rounded-lg shadow-lg">
          {gameMode === 'solo' && (
            <StockfishSettings
              isEnabled={stockfishEnabled}
              depth={stockfishDepth}
              onToggle={() => setStockfishEnabled(!stockfishEnabled)}
              onDepthChange={setStockfishDepth}
            />
          )}
          <ChessTimer
            whiteTime={whiteTime}
            blackTime={blackTime}
            isWhiteTurn={game.turn() === "w"}
            gameStarted={gameState === 'playing'}
          />
          <h1 className="text-3xl font-bold mb-6 text-center">Chess Game</h1>
          <div className="w-96 h-96 bg-gray-200 rounded-lg">
            <Chessboard position={game.fen()} onPieceDrop={onDrop} />
          </div>
          <div className="text-lg font-bold mt-4 text-center">{status}</div>
          {gameMode === 'solo' && stockfishEnabled && (
            <StockfishAnalysis
              fen={game.fen()}
              isEnabled={stockfishEnabled}
              depth={stockfishDepth}
              onAnalysis={setStockfishAnalysis}
            />
          )}
        </div>
      )}

      {showPostGame && (
        <PostGameScreen
          result={gameResult}
          stockfishAnalysis={gameMode === 'solo' && stockfishEnabled ? stockfishAnalysis : undefined}
          onReturnHome={handleReturnHome}
          isMultiplayer={gameMode === 'multiplayer'}
        />
      )}
    </div>
  )
}

export default ChessGame
