import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Chess } from 'chess.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: /http:\/\/localhost:(?:3000|3001|3002|3003|3004|3005)/,
    methods: ["GET", "POST"]
  }
});

interface GameRoom {
  gameId: string;
  players: {
    white?: string;
    black?: string;
  };
  disconnectedPlayers: {
    white?: { id: string; timestamp: number };
    black?: { id: string; timestamp: number };
  };
  game: Chess;
  drawOffers: {
    white: number;
    black: number;
  };
  lastDrawOfferer?: 'white' | 'black';
  timeControl: {
    initial: number;  // Time in seconds
    increment: number;  // Increment in seconds
    white: number;  // Remaining time for white
    black: number;  // Remaining time for black
  };
  lastMoveTimestamp?: number;
}

const gameRooms = new Map<string, GameRoom>();
const RECONNECT_WINDOW = 30000; // 30 seconds to reconnect
const INACTIVE_ROOM_CLEANUP = 3600000; // 1 hour

function createGameRoom(timeControl: { initial: number; increment: number }): string {
  const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  gameRooms.set(gameId, {
    gameId,
    players: {},
    disconnectedPlayers: {},
    game: new Chess(),
    drawOffers: {
      white: 0,
      black: 0
    },
    timeControl: {
      initial: timeControl.initial,
      increment: timeControl.increment,
      white: timeControl.initial,
      black: timeControl.initial
    },
    lastMoveTimestamp: Date.now()
  });
  return gameId;
}

// Clean up inactive rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [gameId, room] of gameRooms.entries()) {
    if (now - (room.lastMoveTimestamp || 0) > INACTIVE_ROOM_CLEANUP) {
      gameRooms.delete(gameId);
    }
  }
}, 300000); // Check every 5 minutes

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentGameId: string | null = null;
  let currentColor: 'white' | 'black' | null = null;

  socket.on('createRoom', ({ timeControl }, callback) => {
    const gameId = createGameRoom(timeControl);
    console.log(`[Room Created] ID: ${gameId}, Creator Socket: ${socket.id}`);
    console.log(`[Room State] Players:`, gameRooms.get(gameId)?.players);
    callback({ gameId });
  });

  socket.on('joinRoom', ({ gameId, isCreator }, callback) => {
    console.log(`[Join Attempt] Game ID: ${gameId}, Socket: ${socket.id}, Is Creator: ${isCreator}`);
    const room = gameRooms.get(gameId);
    
    if (!room) {
      console.log(`[Join Failed] Room ${gameId} not found`);
      callback({ error: 'Room not found' });
      return;
    }

    console.log(`[Room Status] Before Join:
      Game ID: ${gameId}
      White Player: ${room.players.white || 'empty'}
      Black Player: ${room.players.black || 'empty'}
      Disconnected White: ${JSON.stringify(room.disconnectedPlayers.white)}
      Disconnected Black: ${JSON.stringify(room.disconnectedPlayers.black)}
    `);

    // Handle reconnection
    if (room.disconnectedPlayers.white?.id === socket.id) {
      console.log(`[Reconnection] White player reconnecting: ${socket.id}`);
      room.players.white = socket.id;
      delete room.disconnectedPlayers.white;
      currentColor = 'white';
      currentGameId = gameId;
      socket.join(gameId);
      callback({ color: 'white', timeControl: room.timeControl, fen: room.game.fen() });
      return;
    }

    if (room.disconnectedPlayers.black?.id === socket.id) {
      console.log(`[Reconnection] Black player reconnecting: ${socket.id}`);
      room.players.black = socket.id;
      delete room.disconnectedPlayers.black;
      currentColor = 'black';
      currentGameId = gameId;
      socket.join(gameId);
      callback({ color: 'black', timeControl: room.timeControl, fen: room.game.fen() });
      return;
    }

    // If this is the creator joining their own game, assign them to white
    if (isCreator && !room.players.white) {
      console.log(`[Creator Joining] Assigning to white: ${socket.id}`);
      room.players.white = socket.id;
      currentColor = 'white';
      currentGameId = gameId;
      socket.join(gameId);
      callback({ color: 'white', timeControl: room.timeControl, fen: room.game.fen() });
      return;
    }

    // For non-creators, assign to any available position
    let color: 'white' | 'black' | null = null;
    
    if (!room.players.white && !room.disconnectedPlayers.white) {
      color = 'white';
    } else if (!room.players.black && !room.disconnectedPlayers.black) {
      color = 'black';
    }

    if (!color) {
      console.log(`[Room Full] Game ID: ${gameId}, Attempted Join: ${socket.id}
        Current State:
        White: ${room.players.white}
        Black: ${room.players.black}
        Disconnected: ${JSON.stringify(room.disconnectedPlayers)}
      `);
      callback({ error: 'Room is full' });
      return;
    }

    console.log(`[Player Assigned] Game ID: ${gameId}, Socket: ${socket.id}, Color: ${color}`);
    room.players[color] = socket.id;
    currentColor = color;
    currentGameId = gameId;
    socket.join(gameId);

    callback({ 
      color,
      timeControl: room.timeControl,
      fen: room.game.fen()
    });

    if (room.players.white && room.players.black) {
      console.log(`[Game Starting] ID: ${gameId}, White: ${room.players.white}, Black: ${room.players.black}`);
      io.to(gameId).emit('gameStart', {
        white: room.players.white,
        black: room.players.black,
        timeControl: room.timeControl
      });
    }
  });

  socket.on('move', ({ gameId, move, timeRemaining }) => {
    const room = gameRooms.get(gameId);
    if (!room) return;

    try {
      room.game.move(move);
      const currentColor = room.game.turn() === 'w' ? 'black' : 'white';
      const previousColor = currentColor === 'white' ? 'black' : 'white';
      
      // Update time remaining and add increment
      if (typeof timeRemaining === 'number') {
        room.timeControl[previousColor] = timeRemaining + room.timeControl.increment;
      }

      io.to(gameId).emit('moveMade', {
        fen: room.game.fen(),
        move,
        timeControl: {
          white: room.timeControl.white,
          black: room.timeControl.black
        }
      });

      if (room.game.isGameOver()) {
        let result;
        if (room.game.isCheckmate()) {
          result = `${room.game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
        } else if (room.game.isDraw()) {
          result = 'Game drawn!';
        }
        io.to(gameId).emit('gameOver', { result });
      }
    } catch (error) {
      // Invalid move
      socket.emit('error', { message: 'Invalid move' });
    }
  });

  socket.on('timeOut', ({ gameId, color }) => {
    const room = gameRooms.get(gameId);
    if (!room) return;

    const result = `${color === 'white' ? 'Black' : 'White'} wins on time!`;
    io.to(gameId).emit('gameOver', { result });
  });

  socket.on('resign', ({ gameId, color }) => {
    const room = gameRooms.get(gameId);
    if (!room) return;

    const result = `${color === 'white' ? 'Black' : 'White'} wins by resignation!`;
    io.to(gameId).emit('gameOver', { result });
  });

  socket.on('offerDraw', ({ gameId, color }: { gameId: string, color: 'white' | 'black' }) => {
    const room = gameRooms.get(gameId);
    if (!room) return;

    if (room.lastDrawOfferer === color) {
      room.drawOffers[color]++;
      
      if (room.drawOffers[color] === 2) {
        socket.emit('drawWarning');
      } else if (room.drawOffers[color] >= 3) {
        socket.emit('drawDisabled');
        return;
      }
    } else {
      room.drawOffers[color] = 1;
      room.lastDrawOfferer = color;
    }

    const opponent = color === 'white' ? room.players.black : room.players.white;
    if (opponent) {
      io.to(opponent).emit('drawOffered', { from: color });
    }
  });

  socket.on('drawResponse', ({ gameId, accepted }) => {
    const room = gameRooms.get(gameId);
    if (!room) return;

    if (accepted) {
      io.to(gameId).emit('gameOver', { result: 'Game drawn by agreement!' });
    }
  });

  socket.on('returnHome', ({ gameId }) => {
    const room = gameRooms.get(gameId);
    if (!room) return;
    
    gameRooms.delete(gameId);
  });

  socket.on('disconnect', () => {
    console.log(`[Disconnect] Socket: ${socket.id}, Game: ${currentGameId}, Color: ${currentColor}`);
    
    if (currentGameId && currentColor) {
      const room = gameRooms.get(currentGameId);
      if (room) {
        console.log(`[Room State on Disconnect] Game ID: ${currentGameId}
          Before:
          Players: ${JSON.stringify(room.players)}
          Disconnected: ${JSON.stringify(room.disconnectedPlayers)}
        `);

        room.disconnectedPlayers[currentColor] = {
          id: socket.id,
          timestamp: Date.now()
        };
        delete room.players[currentColor];

        console.log(`[Room State After Disconnect]
          Players: ${JSON.stringify(room.players)}
          Disconnected: ${JSON.stringify(room.disconnectedPlayers)}
        `);

        io.to(currentGameId).emit('playerDisconnected', { color: currentColor });

        setTimeout(() => {
          const room = gameRooms.get(currentGameId!);
          if (room?.disconnectedPlayers[currentColor!]?.id === socket.id) {
            console.log(`[Reconnection Timeout] Game: ${currentGameId}, Color: ${currentColor}`);
            io.to(currentGameId!).emit('gameOver', { 
              result: `Game ended - ${currentColor} player failed to reconnect`
            });
            gameRooms.delete(currentGameId!);
          }
        }, RECONNECT_WINDOW);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}); 