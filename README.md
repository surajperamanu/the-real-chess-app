This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install the dependencies:

```bash
npm install
```

This will install all required packages, including:
- socket.io-client for real-time multiplayer functionality
- @types/socket.io-client for TypeScript type definitions
- chess.js for game logic
- react-chessboard for the chess board UI

Then, start the Socket.IO server:

```bash
cd server
npm install  # Install server dependencies
npm run dev  # Start the server with nodemon
```

Finally, in a new terminal, start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Multiplayer Setup

The multiplayer functionality requires both the Next.js client and Socket.IO server to be running:

1. The Socket.IO server runs on port 4000 (http://localhost:4000)
2. The Next.js client runs on port 3000 (http://localhost:3000)

### Troubleshooting Socket.IO Issues

If you encounter Socket.IO related errors:

1. Port in Use Error (EADDRINUSE):
   ```
   Error: listen EADDRINUSE: address already in use :::4000
   ```
   Solution:
   - The server is already running in another terminal
   - Kill the process using port 4000:
     ```bash
     # On Windows
     netstat -ano | findstr :4000
     taskkill /F /PID <PID>
     
     # On Unix-like systems
     lsof -i :4000
     kill -9 <PID>
     ```

2. Socket.IO Connection Errors:
   - Verify the server is running on port 4000
   - Check console for connection error messages
   - Ensure socket.io-client version matches server socket.io version

3. Missing Dependencies:
   ```bash
   npm run validate-deps  # Check Socket.IO dependencies
   npm run predev        # Reinstall Socket.IO dependencies
   ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
