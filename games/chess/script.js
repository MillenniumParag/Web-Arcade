// --- DOM Elements ---
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameModeSelect = document.getElementById('gameMode');
const difficultySettings = document.getElementById('difficultySettings');
const difficultySelect = document.getElementById('difficulty');
const timeControlSelect = document.getElementById('timeControl');
const playerWhiteNameInput = document.getElementById('playerWhiteName');
const playerBlackNameInput = document.getElementById('playerBlackName');
const startGameBtn = document.getElementById('startGameBtn');
const menuBtn = document.getElementById('menuBtn');
const restartBtn = document.getElementById('restartBtn');
const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turnIndicator');
const systemMessage = document.getElementById('systemMessage');
const whiteTimerEl = document.getElementById('whiteTimer');
const blackTimerEl = document.getElementById('blackTimer');
const whiteTimerCard = document.getElementById('whiteTimerCard');
const blackTimerCard = document.getElementById('blackTimerCard');
const whiteCapturesEl = document.getElementById('whiteCaptures');
const blackCapturesEl = document.getElementById('blackCaptures');
const lastMoveEl = document.getElementById('lastMove');

// --- Game State ---
let game = new Chess(); 
let mode = 'pvp';
let difficulty = 'easy';
let players = { w: "White", b: "Black" };
let draggedSquare = null;
let selectedSquare = null; // NEW: Tracks clicks
let capturedByWhite = [];
let capturedByBlack = [];
let timerSeconds = { w: 300, b: 300 };
let activeTimerColor = 'w';
let timerInterval = null;
let clockExpired = false;
let timerEnabled = true;
let baseTimeSeconds = 300;

const piecesMap = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};


function formatTime(seconds) {
    if (seconds === null) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}


function updateTimerUI() {
    if (!timerEnabled) {
        if (whiteTimerEl) whiteTimerEl.textContent = '∞';
        if (blackTimerEl) blackTimerEl.textContent = '∞';
        if (whiteTimerCard && blackTimerCard) {
            whiteTimerCard.classList.remove('active');
            blackTimerCard.classList.remove('active');
        }
        return;
    }

    if (whiteTimerEl) whiteTimerEl.textContent = formatTime(timerSeconds.w);
    if (blackTimerEl) blackTimerEl.textContent = formatTime(timerSeconds.b);

    if (whiteTimerCard && blackTimerCard) {
        whiteTimerCard.classList.toggle('active', activeTimerColor === 'w');
        blackTimerCard.classList.toggle('active', activeTimerColor === 'b');
    }
}

function stopTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handleTimeOut(color) {
    clockExpired = true;
    stopTimers();
    const loserName = color === 'w' ? players.w : players.b;
    const winnerName = color === 'w' ? players.b : players.w;
    turnIndicator.textContent = `${winnerName} wins on time`;
    turnIndicator.className = color === 'w' ? "black-turn" : "white-turn";
    systemMessage.textContent = `${loserName} ran out of time.`;
}

function startTimers() {
    if (!timerEnabled) {
        stopTimers();
        updateTimerUI();
        return;
    }
    stopTimers();
    activeTimerColor = game.turn();
    updateTimerUI();

    timerInterval = setInterval(() => {
        if (clockExpired || game.game_over()) return;
        timerSeconds[activeTimerColor] = Math.max(0, timerSeconds[activeTimerColor] - 1);
        updateTimerUI();
        if (timerSeconds[activeTimerColor] === 0) {
            handleTimeOut(activeTimerColor);
        }
    }, 1000);
}

function switchTimer() {
    if (!timerEnabled) {
        updateTimerUI();
        return;
    }
    activeTimerColor = game.turn();
    updateTimerUI();
}

function resetTimers() {
    timerSeconds = { w: baseTimeSeconds, b: baseTimeSeconds };
    activeTimerColor = 'w';
    clockExpired = false;
    updateTimerUI();
    if (timerEnabled) {
        startTimers();
    } else {
        stopTimers();
    }
}

function renderCapturedPieces() {
    if (!whiteCapturesEl || !blackCapturesEl) return;

    whiteCapturesEl.innerHTML = capturedByWhite
        .map(code => `<span class="capture-piece">${piecesMap[code]}</span>`)
        .join('');
    blackCapturesEl.innerHTML = capturedByBlack
        .map(code => `<span class="capture-piece">${piecesMap[code]}</span>`)
        .join('');
}

function recordCapture(move) {
    if (!move.captured) return;
    const capturedColor = move.color === 'w' ? 'b' : 'w';
    const capturedCode = `${capturedColor}${move.captured.toUpperCase()}`;
    if (move.color === 'w') {
        capturedByWhite.push(capturedCode);
    } else {
        capturedByBlack.push(capturedCode);
    }
    renderCapturedPieces();
}

function isInputLocked() {
    return game.game_over() || clockExpired || (mode === 'pve' && game.turn() === 'b');
}

// --- Menu Logic ---
gameModeSelect.addEventListener('change', (e) => {
    mode = e.target.value;
    if (mode === 'pve') {
        playerBlackNameInput.value = "Computer";
        playerBlackNameInput.disabled = true;
        difficultySettings.style.display = "block";
    } else {
        playerBlackNameInput.value = "Black";
        playerBlackNameInput.disabled = false;
        difficultySettings.style.display = "none";
    }
});

startGameBtn.addEventListener('click', () => {
    players.w = playerWhiteNameInput.value || "White";
    players.b = playerBlackNameInput.value || "Black";
    difficulty = difficultySelect.value;
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
    stopTimers();
});

restartBtn.addEventListener('click', initGame);

// --- Core Game Logic ---
function initGame() {
    game.reset(); 
    selectedSquare = null;
    capturedByWhite = [];
    capturedByBlack = [];
    renderCapturedPieces();
    if (lastMoveEl) lastMoveEl.textContent = "None";
    systemMessage.textContent = "";
    resetTimers();
    updateStatus();
    renderBoard();
}

function updateStatus() {
    if (clockExpired) return;
    let statusHTML = '';
    let moveColor = game.turn() === 'w' ? 'White' : 'Black';
    let currentPlayerName = game.turn() === 'w' ? players.w : players.b;

    turnIndicator.textContent = `${currentPlayerName}'s Turn`;
    turnIndicator.className = game.turn() === 'w' ? "white-turn" : "black-turn";

    if (game.in_checkmate()) statusHTML = `Game over, ${moveColor} is in checkmate.`;
    else if (game.in_draw()) statusHTML = 'Game over, drawn position';
    else if (game.in_check()) statusHTML = 'Check!';
    
    systemMessage.textContent = statusHTML;

    if (game.game_over()) {
        stopTimers();
    }
}

// NEW Utility: Clears all blue dots from the board
function clearHighlights() {
    document.querySelectorAll('.possible-move').forEach(sq => {
        sq.classList.remove('possible-move');
    });
}

function renderBoard() {
    boardElement.innerHTML = '';
    const currentBoard = game.board(); 
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isDark = (row + col) % 2 === 1;
            square.classList.add('square', isDark ? 'dark' : 'light');
            
            const algebraic = String.fromCharCode(97 + col) + (8 - row);
            square.dataset.square = algebraic;

            const pieceObj = currentBoard[row][col];
            if (pieceObj && pieceObj.type === 'k' && pieceObj.color === game.turn() && game.in_check()) {
                square.classList.add('in-check');
            }

            if (pieceObj) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                const code = pieceObj.color + pieceObj.type.toUpperCase();
                piece.textContent = piecesMap[code];
                piece.classList.add(pieceObj.color === 'w' ? 'white' : 'black');
                
                // Drag & Drop
                piece.draggable = true;
                piece.addEventListener('dragstart', (e) => {
                    if (isInputLocked()) {
                        e.preventDefault();
                        return;
                    }
                    draggedSquare = algebraic;
                    clearHighlights(); // Clear clicks when dragging
                });
                
                square.appendChild(piece);
            }

            // --- CLICK TO MOVE LOGIC ---
            square.addEventListener('click', () => {
                if (isInputLocked()) return;

                // 1. If we clicked a highlighted square, execute the move!
                if (square.classList.contains('possible-move') && selectedSquare) {
                    handleMove(selectedSquare, algebraic);
                    clearHighlights();
                    selectedSquare = null;
                    return;
                }

                clearHighlights();
                selectedSquare = null;

                // 2. If we clicked our own piece, highlight its moves
                if (pieceObj && pieceObj.color === game.turn()) {
                    selectedSquare = algebraic;
                    // Get moves for this specific square
                    const moves = game.moves({ square: algebraic, verbose: true });
                    
                    moves.forEach(move => {
                        const targetEl = document.querySelector(`[data-square="${move.to}"]`);
                        if (targetEl) targetEl.classList.add('possible-move');
                    });
                }
            });

            // --- DROP LOGIC ---
            square.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                square.classList.add('drag-over');
            });
            
            square.addEventListener('dragleave', () => square.classList.remove('drag-over'));
            
            square.addEventListener('drop', (e) => {
                e.preventDefault();
                square.classList.remove('drag-over');

                if (isInputLocked()) return;
                
                let targetSquare = e.target.dataset.square;
                if (!targetSquare) targetSquare = e.target.parentElement.dataset.square;

                handleMove(draggedSquare, targetSquare);
            });

            boardElement.appendChild(square);
        }
    }
}

function handleMove(source, target) {
    if (source === target) return;

    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' 
    });

    if (move === null) return; 

    applyMove(move);
}

function applyMove(move) {
    selectedSquare = null; // Reset clicks after move
    recordCapture(move);
    if (lastMoveEl) lastMoveEl.textContent = move.san;
    renderBoard();
    switchTimer();
    updateStatus();

    if (game.game_over() || clockExpired) return;

    if (mode === 'pve' && game.turn() === 'b') {
        window.setTimeout(makeAIMove, 400);
    }
}

// --- Computer AI Logic ---
function makeAIMove() {
    if (game.game_over() || clockExpired) return;

    const possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;

    let chosenMove;

    if (difficulty === 'easy') {
        chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    } 
    else if (difficulty === 'medium') {
        const captures = possibleMoves.filter(m => m.includes('x'));
        if (captures.length > 0) {
            chosenMove = captures[Math.floor(Math.random() * captures.length)];
        } else {
            chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }
    } 
    else if (difficulty === 'hard') {
        chosenMove = getBestMove(game, 2);
    }

    const move = game.move(chosenMove);
    if (!move) return;
    applyMove(move);
}

function evaluateBoard(gameObj) {
    const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900 };
    let value = 0;
    const board = gameObj.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c]) {
                const p = board[r][c];
                value += pieceValues[p.type] * (p.color === 'w' ? 1 : -1);
            }
        }
    }
    return value;
}

function minimax(gameObj, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || gameObj.game_over()) return evaluateBoard(gameObj);

    const moves = gameObj.moves();
    
    if (isMaximizing) {
        let bestVal = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            gameObj.move(moves[i]);
            bestVal = Math.max(bestVal, minimax(gameObj, depth - 1, alpha, beta, !isMaximizing));
            gameObj.undo();
            alpha = Math.max(alpha, bestVal);
            if (beta <= alpha) break;
        }
        return bestVal;
    } else {
        let bestVal = Infinity;
        for (let i = 0; i < moves.length; i++) {
            gameObj.move(moves[i]);
            bestVal = Math.min(bestVal, minimax(gameObj, depth - 1, alpha, beta, !isMaximizing));
            gameObj.undo();
            beta = Math.min(beta, bestVal);
            if (beta <= alpha) break;
        }
        return bestVal;
    }
}

function getBestMove(gameObj, depth) {
    const moves = gameObj.moves();
    let bestMove = null;
    let bestValue = gameObj.turn() === 'w' ? -Infinity : Infinity;

    for (let i = 0; i < moves.length; i++) {
        gameObj.move(moves[i]);
        const boardValue = minimax(gameObj, depth - 1, -Infinity, Infinity, gameObj.turn() === 'w');
        gameObj.undo();

        if (gameObj.turn() === 'w') {
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = moves[i];
            }
        } else {
            if (boardValue < bestValue) {
                bestValue = boardValue;
                bestMove = moves[i];
            }
        }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}