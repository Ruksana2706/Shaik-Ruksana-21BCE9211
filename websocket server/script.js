const ws = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {};
let currentPlayer = 'A'; // or 'B', depending on the player connected

ws.onopen = () => {
    console.log("Connected to WebSocket server");
    ws.send(JSON.stringify({ type: 'initialize' }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'gameState') {
        gameState = message.state;
        drawGame();
    } else if (message.type === 'invalidMove') {
        alert(message.message);
    }
};

ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};

ws.onclose = () => {
    console.log("WebSocket connection closed");
};

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const player in gameState.players) {
        for (const piece in gameState.players[player].pieces) {
            const { x, y } = gameState.players[player].pieces[piece];
            ctx.fillStyle = player === 'A' ? 'red' : 'blue';
            ctx.fillRect(x * 100, y * 100, 100, 100);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(piece, x * 100 + 50, y * 100 + 50);
        }
    }
}

document.getElementById('makeMove').addEventListener('click', () => {
    const piece = prompt("Enter the piece you want to move (e.g., P1, H1):");
    const direction = prompt("Enter the move direction (U, D, L, R):");
    
    if (piece && direction) {
        ws.send(JSON.stringify({ type: 'move', player: currentPlayer, piece: piece, direction: direction }));
    } else {
        alert("Invalid input!");
    }
});