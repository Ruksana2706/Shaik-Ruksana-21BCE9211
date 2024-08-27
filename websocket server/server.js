const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let clients = [];
let gameState = initializeGame();

function initializeGame() {
    return {
        board: Array(5).fill(null).map(() => Array(5).fill(null)), // 5x5 board
        players: {
            A: { pieces: { 'P1': { x: 0, y: 0 }, 'P2': { x: 1, y: 0 }, 'H1': { x: 2, y: 0 }, 'H2': { x: 3, y: 0 }, 'H3': { x: 4, y: 0 } }, score: 0 },
            B: { pieces: { 'P1': { x: 0, y: 4 }, 'P2': { x: 1, y: 4 }, 'H1': { x: 2, y: 4 }, 'H2': { x: 3, y: 4 }, 'H3': { x: 4, y: 4 } }, score: 0 }
        },
        currentPlayer: 'A',
        gameOver: false
    };
}

wss.on('connection', (ws) => {
    clients.push(ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'initialize') {
            ws.send(JSON.stringify({ type: 'gameState', state: gameState }));
        } else if (data.type === 'move' && !gameState.gameOver) {
            if (data.player === gameState.currentPlayer && processMove(data.player, data.piece, data.direction)) {
                gameState.currentPlayer = gameState.currentPlayer === 'A' ? 'B' : 'A';
                checkGameOver();
                broadcastGameState();
            } else {
                ws.send(JSON.stringify({ type: 'invalidMove', message: 'Invalid move or not your turn!' }));
            }
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

function processMove(player, piece, direction) {
    const piecePosition = gameState.players[player].pieces[piece];
    if (!piecePosition) return false;

    const newPosition = calculateNewPosition(piecePosition, direction, piece);

    if (isValidMove(player, piece, newPosition)) {
        updateGameState(player, piece, newPosition);
        return true;
    }

    return false;
}

function calculateNewPosition(position, direction, piece) {
    const newPosition = { ...position };
    const pieceType = piece[0];

    if (pieceType === 'P') {
        // Pawn movement
        if (direction === 'L') newPosition.x -= 1;
        if (direction === 'R') newPosition.x += 1;
        if (direction === 'F') newPosition.y -= 1;
        if (direction === 'B') newPosition.y += 1;
    } else if (pieceType === 'H' && piece[1] === '1') {
        // Hero1 movement
        if (direction === 'L') newPosition.x -= 2;
        if (direction === 'R') newPosition.x += 2;
        if (direction === 'F') newPosition.y -= 2;
        if (direction === 'B') newPosition.y += 2;
    } else if (pieceType === 'H' && piece[1] === '2') {
        // Hero2 movement
        if (direction === 'FL') { newPosition.x -= 2; newPosition.y -= 2; }
        if (direction === 'FR') { newPosition.x += 2; newPosition.y -= 2; }
        if (direction === 'BL') { newPosition.x -= 2; newPosition.y += 2; }
        if (direction === 'BR') { newPosition.x += 2; newPosition.y += 2; }
    }

    return newPosition;
}

function isValidMove(player, piece, newPosition) {
    // Check if new position is within bounds
    if (newPosition.x < 0 || newPosition.x > 4 || newPosition.y < 0 || newPosition.y > 4) return false;

    const currentPosition = gameState.players[player].pieces[piece];
    const pieceType = piece[0];

    // Check if the move is valid for the piece type
    if (pieceType === 'P') {
        // Pawn can move one block in any direction
        if (Math.abs(newPosition.x - currentPosition.x) + Math.abs(newPosition.y - currentPosition.y) !== 1) return false;
    } else if (pieceType === 'H' && piece[1] === '1') {
        // Hero1 can move two blocks straight in any direction
        if (Math.abs(newPosition.x - currentPosition.x) + Math.abs(newPosition.y - currentPosition.y) !== 2) return false;
        if (newPosition.x !== currentPosition.x && newPosition.y !== currentPosition.y) return false;
    } else if (pieceType === 'H' && piece[1] === '2') {
        // Hero2 can move two blocks diagonally in any direction
        if (Math.abs(newPosition.x - currentPosition.x) !== 2 || Math.abs(newPosition.y - currentPosition.y) !== 2) return false;
    }

    // Check if the path is clear (for Hero1 and Hero2)
    if (pieceType === 'H') {
        const dx = Math.sign(newPosition.x - currentPosition.x);
        const dy = Math.sign(newPosition.y - currentPosition.y);
        let x = currentPosition.x + dx;
        let y = currentPosition.y + dy;
        while (x !== newPosition.x || y !== newPosition.y) {
            if (isOccupied(x, y, player)) return false;
            x += dx;
            y += dy;
        }
    }

    // Check if the target position is occupied by the player's own piece
    return !isOccupied(newPosition.x, newPosition.y, player);
}

function isOccupied(x, y, player) {
    return Object.values(gameState.players[player].pieces).some(pos => pos.x === x && pos.y === y);
}

function updateGameState(player, piece, newPosition) {
    const opponent = player === 'A' ? 'B' : 'A';
    const capturedPiece = Object.entries(gameState.players[opponent].pieces).find(
        ([_, pos]) => pos.x === newPosition.x && pos.y === newPosition.y
    );

    if (capturedPiece) {
        delete gameState.players[opponent].pieces[capturedPiece[0]];
    }

    gameState.players[player].pieces[piece] = newPosition;
}

function checkGameOver() {
    if (Object.keys(gameState.players.A.pieces).length === 0) {
        gameState.gameOver = true;
        gameState.winner = 'B';
    } else if (Object.keys(gameState.players.B.pieces).length === 0) {
        gameState.gameOver = true;
        gameState.winner = 'A';
    }
}

function broadcastGameState() {
    const gameStateMessage = JSON.stringify({ type: 'gameState', state: gameState });

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(gameStateMessage);
        }
    });
}

console.log('WebSocket server is running on ws://localhost:8080');