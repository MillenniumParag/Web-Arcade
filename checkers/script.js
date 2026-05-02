// --- DOM Elements ---
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameModeSelect = document.getElementById('gameMode');
const playerRedNameInput = document.getElementById('playerRedName');
const playerBlackNameInput = document.getElementById('playerBlackName');
const startGameBtn = document.getElementById('startGameBtn');
const menuBtn = document.getElementById('menuBtn');
const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turnIndicator');
const restartBtn = document.getElementById('restartBtn');
const systemMessage = document.getElementById('systemMessage');

// --- Game State ---
let board = [];
let currentPlayer = 1; // 1 = Red, 2 = Black
let selectedSquare = null;
let validMoves = [];
let mode = 'pvp';
let players = { 1: "Player 1", 2: "Player 2" };
let forcedJumpPieces = []; 
let gameActive = false; // Added to prevent clicking after game over

// --- Menu Logic ---
gameModeSelect.addEventListener('change', (e) => {
    mode = e.target.value;
    if (mode === 'pve') {
        playerBlackNameInput.value = "Computer";
        playerBlackNameInput.disabled = true;
    } else {
        playerBlackNameInput.value = "Player 2";
        playerBlackNameInput.disabled = false;
    }
});

startGameBtn.addEventListener('click', () => {
    players[1] = playerRedNameInput.value || "Red Player";
    players[2] = playerBlackNameInput.value || "Black Player";
    setupScreen.style.display = "none";
    gameScreen.style.display = "flex";
    initGame();
});

menuBtn.addEventListener('click', () => {
    gameScreen.style.display = "none";
    setupScreen.style.display = "block";
    gameActive = false;
});

// --- Core Game Logic ---
function initGame() {
    board = [
        [0, 2, 0, 2, 0, 2, 0, 2],
        [2, 0, 2, 0, 2, 0, 2, 0],
        [0, 2, 0, 2, 0, 2, 0, 2],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0]
    ];
    currentPlayer = 1;
    selectedSquare = null;
    validMoves = [];
    systemMessage.textContent = "";
    gameActive = true;
    
    checkForForcedJumps();
    updateTurnIndicator();
    renderBoard();
}

function updateTurnIndicator() {
    if (!gameActive) return;

    turnIndicator.textContent = `${players[currentPlayer]}'s Turn`;
    turnIndicator.className = currentPlayer === 1 ? "red-turn" : "black-turn";
    
    // Trigger AI if it's PvE and Black's turn
    if (mode === 'pve' && currentPlayer === 2) {
        setTimeout(makeAIMove, 800); 
    }
}

function renderBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isDark = (row + col) % 2 === 1;
            square.classList.add('square', isDark ? 'dark' : 'light');
            
            const pieceValue = board[row][col];
            if (pieceValue > 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                if (pieceValue === 1 || pieceValue === 3) piece.classList.add('red');
                if (pieceValue === 2 || pieceValue === 4) piece.classList.add('black');
                if (pieceValue > 2) piece.classList.add('king');
                square.appendChild(piece);
            }

            // Highlighting
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            if (validMoves.find(m => m.row === row && m.col === col)) {
                square.classList.add('valid-move');
            }
            if (forcedJumpPieces.find(p => p.row === row && p.col === col)) {
                square.classList.add('forced-piece');
            }

            if (isDark) square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    if (!gameActive) return; // Prevent clicks if game is over
    if (mode === 'pve' && currentPlayer === 2) return; // Prevent clicking during computer turn

    const clickedValue = board[row][col];
    const isPlayerPiece = (currentPlayer === 1 && (clickedValue === 1 || clickedValue === 3)) || 
                          (currentPlayer === 2 && (clickedValue === 2 || clickedValue === 4));

    // 1. Select a piece
    if (isPlayerPiece) {
        if (forcedJumpPieces.length > 0) {
            const isForcedPiece = forcedJumpPieces.find(p => p.row === row && p.col === col);
            if (!isForcedPiece) {
                systemMessage.textContent = "Jump forced! You must play a highlighted piece.";
                return;
            }
        }
        
        systemMessage.textContent = "";
        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col, clickedValue);
        
        if (forcedJumpPieces.length > 0) {
            validMoves = validMoves.filter(m => m.capture);
        }
        renderBoard();
        return;
    }

    // 2. Click a valid destination
    if (selectedSquare) {
        const move = validMoves.find(m => m.row === row && m.col === col);
        if (move) {
            executeMove(move);
            return;
        }
    }
    
    selectedSquare = null;
    validMoves = [];
    renderBoard();
}

// --- Rules & Movement ---
function checkForForcedJumps() {
    forcedJumpPieces = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            const isPlayerPiece = (currentPlayer === 1 && (piece === 1 || piece === 3)) || 
                                  (currentPlayer === 2 && (piece === 2 || piece === 4));
            if (isPlayerPiece) {
                const moves = getValidMoves(r, c, piece);
                if (moves.some(m => m.capture)) {
                    forcedJumpPieces.push({ row: r, col: c });
                }
            }
        }
    }
}

function getValidMoves(r, c, piece) {
    let moves = [];
    const isRed = (piece === 1 || piece === 3);
    const isKing = (piece === 3 || piece === 4);
    
    let directions = [];
    if (isRed || isKing) directions.push(-1); 
    if (!isRed || isKing) directions.push(1); 

    directions.forEach(dr => {
        [-1, 1].forEach(dc => {
            let nextR = r + dr, nextC = c + dc;
            
            if (isOnBoard(nextR, nextC) && board[nextR][nextC] === 0) {
                moves.push({ row: nextR, col: nextC });
            }
            
            let jumpR = r + (dr * 2), jumpC = c + (dc * 2);
            if (isOnBoard(jumpR, jumpC) && board[jumpR][jumpC] === 0 && isOnBoard(nextR, nextC)) {
                let midPiece = board[nextR][nextC];
                if (midPiece !== 0 && isOpponent(piece, midPiece)) {
                    moves.push({ row: jumpR, col: jumpC, capture: { row: nextR, col: nextC } });
                }
            }
        });
    });
    return moves;
}

function executeMove(move) {
    const piece = board[selectedSquare.row][selectedSquare.col];
    
    board[move.row][move.col] = piece;
    board[selectedSquare.row][selectedSquare.col] = 0; 
    
    if (move.capture) {
        board[move.capture.row][move.capture.col] = 0;
    }

    // Kinging
    if (currentPlayer === 1 && move.row === 0 && piece === 1) board[move.row][move.col] = 3;
    if (currentPlayer === 2 && move.row === 7 && piece === 2) board[move.row][move.col] = 4;

    // Next turn setup
    selectedSquare = null;
    validMoves = [];
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    
    checkForForcedJumps();
    
    // Check for a winner before continuing
    if (checkWinCondition()) return; 

    updateTurnIndicator();
    renderBoard();
}

// --- Win Detection Logic ---
function checkWinCondition() {
    let redCount = 0;
    let blackCount = 0;
    let redHasMoves = false;
    let blackHasMoves = false;

    // Count pieces and check for valid moves
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === 1 || piece === 3) {
                redCount++;
                if (getValidMoves(r, c, piece).length > 0) redHasMoves = true;
            }
            if (piece === 2 || piece === 4) {
                blackCount++;
                if (getValidMoves(r, c, piece).length > 0) blackHasMoves = true;
            }
        }
    }

    // If Red has no pieces, or it's Red's turn but they are blocked
    if (redCount === 0 || (currentPlayer === 1 && !redHasMoves)) {
        endGame(2); // Black Wins
        return true;
    }
    
    // If Black has no pieces, or it's Black's turn but they are blocked
    if (blackCount === 0 || (currentPlayer === 2 && !blackHasMoves)) {
        endGame(1); // Red Wins
        return true;
    }

    return false;
}

function endGame(winner) {
    gameActive = false; // Freezes the board
    turnIndicator.textContent = `🏆 ${players[winner]} WINS! 🏆`;
    turnIndicator.className = winner === 1 ? "red-turn" : "black-turn";
    systemMessage.textContent = "Game Over. Click Restart to play again.";
    systemMessage.style.color = "#4ade80"; // Bright green to signify game end
    renderBoard();
}

// --- Computer AI ---
function makeAIMove() {
    if (!gameActive) return;

    let allPossibleMoves = [];
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === 2 || piece === 4) {
                let moves = getValidMoves(r, c, piece);
                moves.forEach(m => {
                    allPossibleMoves.push({ from: {row: r, col: c}, to: m });
                });
            }
        }
    }

    let jumps = allPossibleMoves.filter(m => m.to.capture);
    let chosenMove;
    
    if (jumps.length > 0) {
        chosenMove = jumps[Math.floor(Math.random() * jumps.length)];
    } else if (allPossibleMoves.length > 0) {
        chosenMove = allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)];
    } else {
        return; // Shouldn't hit this due to win condition check, but just in case
    }

    selectedSquare = chosenMove.from;
    executeMove(chosenMove.to);
}

// Utils
function isOnBoard(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function isOpponent(myPiece, otherPiece) {
    const myColor = (myPiece === 1 || myPiece === 3) ? "red" : "black";
    const otherColor = (otherPiece === 1 || otherPiece === 3) ? "red" : "black";
    return myColor !== otherColor;
}

restartBtn.addEventListener('click', initGame);