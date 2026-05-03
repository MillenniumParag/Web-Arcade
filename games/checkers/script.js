// --- DOM Elements ---
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameModeSelect = document.getElementById('gameMode');
const difficultySettings = document.getElementById('difficultySettings');
const difficultySelect = document.getElementById('difficulty');
const timeControlSelect = document.getElementById('timeControl');
const playerRedNameInput = document.getElementById('playerRedName');
const playerBlackNameInput = document.getElementById('playerBlackName');
const startGameBtn = document.getElementById('startGameBtn');
const menuBtn = document.getElementById('menuBtn');
const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turnIndicator');
const restartBtn = document.getElementById('restartBtn');
const systemMessage = document.getElementById('systemMessage');
const redTimerEl = document.getElementById('redTimer');
const blackTimerEl = document.getElementById('blackTimer');
const redTimerCard = document.getElementById('redTimerCard');
const blackTimerCard = document.getElementById('blackTimerCard');

// --- Game State ---
let board = [];
let currentPlayer = 1; // 1 = Red, 2 = Black
let selectedSquare = null;
let validMoves = [];
let mode = 'pvp';
let difficulty = 'easy';
let players = { 1: "Player 1", 2: "Player 2" };
let forcedJumpPieces = []; 
let gameActive = false; // Added to prevent clicking after game over
let timerSeconds = { 1: 300, 2: 300 };
let activeTimerPlayer = 1;
let timerInterval = null;
let timerEnabled = true;
let baseTimeSeconds = 300;
let clockExpired = false;

function formatTime(seconds) {
    if (seconds === null) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerUI() {
    if (!timerEnabled) {
        if (redTimerEl) redTimerEl.textContent = '∞';
        if (blackTimerEl) blackTimerEl.textContent = '∞';
        if (redTimerCard && blackTimerCard) {
            redTimerCard.classList.remove('active');
            blackTimerCard.classList.remove('active');
        }
        return;
    }

    if (redTimerEl) redTimerEl.textContent = formatTime(timerSeconds[1]);
    if (blackTimerEl) blackTimerEl.textContent = formatTime(timerSeconds[2]);

    if (redTimerCard && blackTimerCard) {
        redTimerCard.classList.toggle('active', activeTimerPlayer === 1);
        blackTimerCard.classList.toggle('active', activeTimerPlayer === 2);
    }
}

function stopTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handleTimeOut(player) {
    clockExpired = true;
    gameActive = false;
    stopTimers();
    const loserName = players[player];
    const winner = player === 1 ? 2 : 1;
    const winnerName = players[winner];
    turnIndicator.textContent = `${winnerName} wins on time`;
    turnIndicator.className = winner === 1 ? "red-turn" : "black-turn";
    systemMessage.textContent = `${loserName} ran out of time.`;
}

function startTimers() {
    if (!timerEnabled) {
        stopTimers();
        updateTimerUI();
        return;
    }
    stopTimers();
    activeTimerPlayer = currentPlayer;
    updateTimerUI();

    timerInterval = setInterval(() => {
        if (clockExpired || !gameActive) return;
        timerSeconds[activeTimerPlayer] = Math.max(0, timerSeconds[activeTimerPlayer] - 1);
        updateTimerUI();
        if (timerSeconds[activeTimerPlayer] === 0) {
            handleTimeOut(activeTimerPlayer);
        }
    }, 1000);
}

function switchTimer() {
    if (!timerEnabled) {
        updateTimerUI();
        return;
    }
    activeTimerPlayer = currentPlayer;
    updateTimerUI();
}

function resetTimers() {
    timerSeconds = { 1: baseTimeSeconds, 2: baseTimeSeconds };
    activeTimerPlayer = 1;
    clockExpired = false;
    updateTimerUI();
    if (timerEnabled) {
        startTimers();
    } else {
        stopTimers();
    }
}

// --- Menu Logic ---
gameModeSelect.addEventListener('change', (e) => {
    mode = e.target.value;
    if (mode === 'pve') {
        playerBlackNameInput.value = "Computer";
        playerBlackNameInput.disabled = true;
        difficultySettings.style.display = "block";
    } else {
        playerBlackNameInput.value = "Player 2";
        playerBlackNameInput.disabled = false;
        difficultySettings.style.display = "none";
    }
});

startGameBtn.addEventListener('click', () => {
    players[1] = playerRedNameInput.value || "Red Player";
    players[2] = playerBlackNameInput.value || "Black Player";
    difficulty = difficultySelect ? difficultySelect.value : 'easy';
    const selectedTime = timeControlSelect ? timeControlSelect.value : '5';
    if (selectedTime === 'unlimited') {
        timerEnabled = false;
        baseTimeSeconds = 0;
    } else {
        timerEnabled = true;
        baseTimeSeconds = Math.max(1, parseInt(selectedTime, 10)) * 60;
    }
    setupScreen.style.display = "none";
    gameScreen.style.display = "flex";
    initGame();
});

menuBtn.addEventListener('click', () => {
    gameScreen.style.display = "none";
    setupScreen.style.display = "block";
    gameActive = false;
    stopTimers();
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
    systemMessage.style.color = "";
    gameActive = true;
    resetTimers();
    
    checkForForcedJumps();
    updateTurnIndicator();
    renderBoard();
}

function updateTurnIndicator() {
    if (!gameActive || clockExpired) return;

    turnIndicator.textContent = `${players[currentPlayer]}'s Turn`;
    turnIndicator.className = currentPlayer === 1 ? "red-turn" : "black-turn";
    switchTimer();
    
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
    if (!gameActive || clockExpired) return; // Prevent clicks if game is over
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

function getValidMovesOnBoard(boardState, r, c, piece) {
    let moves = [];
    const isRed = (piece === 1 || piece === 3);
    const isKing = (piece === 3 || piece === 4);

    let directions = [];
    if (isRed || isKing) directions.push(-1);
    if (!isRed || isKing) directions.push(1);

    directions.forEach(dr => {
        [-1, 1].forEach(dc => {
            let nextR = r + dr, nextC = c + dc;

            if (isOnBoard(nextR, nextC) && boardState[nextR][nextC] === 0) {
                moves.push({ row: nextR, col: nextC });
            }

            let jumpR = r + (dr * 2), jumpC = c + (dc * 2);
            if (isOnBoard(jumpR, jumpC) && boardState[jumpR][jumpC] === 0 && isOnBoard(nextR, nextC)) {
                let midPiece = boardState[nextR][nextC];
                if (midPiece !== 0 && isOpponent(piece, midPiece)) {
                    moves.push({ row: jumpR, col: jumpC, capture: { row: nextR, col: nextC } });
                }
            }
        });
    });
    return moves;
}

function getAllMovesForPlayer(boardState, player) {
    let moves = [];
    let captureMoves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            const isPlayerPiece = (player === 1 && (piece === 1 || piece === 3)) ||
                                  (player === 2 && (piece === 2 || piece === 4));
            if (!isPlayerPiece) continue;

            const pieceMoves = getValidMovesOnBoard(boardState, r, c, piece);
            pieceMoves.forEach(move => {
                const item = { from: { row: r, col: c }, to: move };
                if (move.capture) captureMoves.push(item);
                else moves.push(item);
            });
        }
    }

    return captureMoves.length > 0 ? captureMoves : moves;
}

function cloneBoard(boardState) {
    return boardState.map(row => row.slice());
}

function applyMoveToBoard(boardState, from, move, player) {
    const newBoard = cloneBoard(boardState);
    const piece = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = 0;
    newBoard[move.row][move.col] = piece;

    if (move.capture) {
        newBoard[move.capture.row][move.capture.col] = 0;
    }

    if (player === 1 && move.row === 0 && piece === 1) newBoard[move.row][move.col] = 3;
    if (player === 2 && move.row === 7 && piece === 2) newBoard[move.row][move.col] = 4;

    return newBoard;
}

function evaluateBoardState(boardState) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece === 2) score += 1;
            if (piece === 4) score += 2;
            if (piece === 1) score -= 1;
            if (piece === 3) score -= 2;
        }
    }
    return score;
}

function chooseMoveMedium(moves, boardState, player) {
    let bestScore = -Infinity;
    let bestMoves = [];
    const opponent = player === 1 ? 2 : 1;

    moves.forEach(item => {
        const piece = boardState[item.from.row][item.from.col];
        const nextBoard = applyMoveToBoard(boardState, item.from, item.to, player);
        let score = evaluateBoardState(nextBoard);

        if (item.to.capture) score += 1.5;
        if (player === 2 && piece === 2 && item.to.row === 7) score += 1;
        if (player === 1 && piece === 1 && item.to.row === 0) score += 1;

        const opponentMoves = getAllMovesForPlayer(nextBoard, opponent);
        if (opponentMoves.some(m => m.to.capture)) score -= 1;

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [item];
        } else if (score === bestScore) {
            bestMoves.push(item);
        }
    });

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function chooseMoveHard(moves, boardState, player) {
    let bestScore = -Infinity;
    let bestMoves = [];
    const opponent = player === 1 ? 2 : 1;

    moves.forEach(item => {
        const nextBoard = applyMoveToBoard(boardState, item.from, item.to, player);
        const opponentMoves = getAllMovesForPlayer(nextBoard, opponent);

        let score;
        if (opponentMoves.length === 0) {
            score = 100;
        } else {
            let worst = Infinity;
            opponentMoves.forEach(oppMove => {
                const replyBoard = applyMoveToBoard(nextBoard, oppMove.from, oppMove.to, opponent);
                const replyScore = evaluateBoardState(replyBoard);
                if (replyScore < worst) worst = replyScore;
            });
            score = worst;
        }

        if (item.to.capture) score += 1;

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [item];
        } else if (score === bestScore) {
            bestMoves.push(item);
        }
    });

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
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
    stopTimers();
    turnIndicator.textContent = `🏆 ${players[winner]} WINS! 🏆`;
    turnIndicator.className = winner === 1 ? "red-turn" : "black-turn";
    systemMessage.textContent = "Game Over. Click Restart to play again.";
    systemMessage.style.color = "#4ade80"; // Bright green to signify game end
    renderBoard();
}

// --- Computer AI ---
function makeAIMove() {
    if (!gameActive || clockExpired) return;

    const moves = getAllMovesForPlayer(board, 2);
    if (moves.length === 0) return;

    let chosenMove;
    if (difficulty === 'easy') {
        chosenMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (difficulty === 'medium') {
        chosenMove = chooseMoveMedium(moves, board, 2);
    } else {
        chosenMove = chooseMoveHard(moves, board, 2);
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