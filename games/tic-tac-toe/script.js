// --- DOM Elements ---
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameModeSelect = document.getElementById('gameMode');
const playerONameInput = document.getElementById('playerOName');
const difficultySettings = document.getElementById('difficultySettings');
const difficultySelect = document.getElementById('difficulty');
const timeControlSelect = document.getElementById('timeControl');
const startGameBtn = document.getElementById('startGameBtn');
const cells = document.querySelectorAll('.cell');
const statusMessage = document.getElementById('statusMessage');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const xTimerEl = document.getElementById('xTimer');
const oTimerEl = document.getElementById('oTimer');
const xTimerCard = document.getElementById('xTimerCard');
const oTimerCard = document.getElementById('oTimerCard');

// --- Game State Variables ---
let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = false;
let mode = "pvp"; 
let difficulty = "easy";
let players = { X: "Player 1", O: "Player 2" };
let timerSeconds = { X: 300, O: 300 };
let activeTimerPlayer = "X";
let timerInterval = null;
let timerEnabled = true;
let baseTimeSeconds = 300;
let clockExpired = false;

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], 
    [0, 3, 6], [1, 4, 7], [2, 5, 8], 
    [0, 4, 8], [2, 4, 6]             
];

function formatTime(seconds) {
    if (seconds === null) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerUI() {
    if (!timerEnabled) {
        if (xTimerEl) xTimerEl.textContent = '∞';
        if (oTimerEl) oTimerEl.textContent = '∞';
        if (xTimerCard && oTimerCard) {
            xTimerCard.classList.remove('active');
            oTimerCard.classList.remove('active');
        }
        return;
    }

    if (xTimerEl) xTimerEl.textContent = formatTime(timerSeconds.X);
    if (oTimerEl) oTimerEl.textContent = formatTime(timerSeconds.O);

    if (xTimerCard && oTimerCard) {
        xTimerCard.classList.toggle('active', activeTimerPlayer === 'X');
        oTimerCard.classList.toggle('active', activeTimerPlayer === 'O');
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
    const winner = player === 'X' ? 'O' : 'X';
    statusMessage.textContent = `${players[winner]} wins on time!`;
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
    timerSeconds = { X: baseTimeSeconds, O: baseTimeSeconds };
    activeTimerPlayer = 'X';
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
        playerONameInput.value = "Computer";
        playerONameInput.disabled = true;
        difficultySettings.style.display = "block";
    } else {
        playerONameInput.value = "Player 2";
        playerONameInput.disabled = false;
        difficultySettings.style.display = "none";
    }
});

startGameBtn.addEventListener('click', () => {
    players.X = document.getElementById('playerXName').value || "Player 1";
    players.O = playerONameInput.value || "Player 2";
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
    gameScreen.style.display = "block";
    restartGame();
});

menuButton.addEventListener('click', () => {
    gameScreen.style.display = "none";
    setupScreen.style.display = "block";
    gameActive = false;
    stopTimers();
});

// --- Gameplay Logic ---
function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    if (board[clickedCellIndex] !== "" || !gameActive || clockExpired || (mode === 'pve' && currentPlayer === "O")) {
        return;
    }
    processMove(clickedCellIndex);
}

function processMove(index) {
    board[index] = currentPlayer;
    cells[index].textContent = currentPlayer;
    cells[index].classList.add(currentPlayer === "X" ? "x-mark" : "o-mark");

    if (checkWinner(board, currentPlayer)) {
        statusMessage.textContent = `${players[currentPlayer]} has won!`;
        gameActive = false;
        stopTimers();
        return;
    }

    if (!board.includes("")) {
        statusMessage.textContent = "Game ended in a draw!";
        gameActive = false;
        stopTimers();
        return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusMessage.textContent = `${players[currentPlayer]}'s turn`;
    switchTimer();

    if (mode === 'pve' && currentPlayer === "O" && gameActive) {
        setTimeout(makeAIMove, 500); 
    }
}

// --- AI Logic ---
function makeAIMove() {
    if (clockExpired || !gameActive) return;
    let availableSpots = board.map((val, index) => val === "" ? index : null).filter(val => val !== null);
    let chosenIndex;

    if (difficulty === "easy") {
        chosenIndex = availableSpots[Math.floor(Math.random() * availableSpots.length)];
    } 
    else if (difficulty === "medium") {
        chosenIndex = getWinningMove("O") ?? getWinningMove("X") ?? availableSpots[Math.floor(Math.random() * availableSpots.length)];
    } 
    else if (difficulty === "hard") {
        chosenIndex = minimax(board, "O").index;
    }

    processMove(chosenIndex);
}

function getWinningMove(player) {
    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = player;
            let win = checkWinner(board, player);
            board[i] = ""; 
            if (win) return i;
        }
    }
    return null;
}

function minimax(newBoard, player) {
    let availSpots = newBoard.map((val, index) => val === "" ? index : null).filter(val => val !== null);

    if (checkWinner(newBoard, "X")) return { score: -10 };
    if (checkWinner(newBoard, "O")) return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };

    let moves = [];
    for (let i = 0; i < availSpots.length; i++) {
        let move = {};
        move.index = availSpots[i];
        newBoard[availSpots[i]] = player;

        if (player === "O") {
            move.score = minimax(newBoard, "X").score;
        } else {
            move.score = minimax(newBoard, "O").score;
        }

        newBoard[availSpots[i]] = "";
        moves.push(move);
    }

    let bestMove;
    if (player === "O") {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }
    return moves[bestMove];
}

// --- Utilities ---
function checkWinner(boardState, player) {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (boardState[a] === player && boardState[b] === player && boardState[c] === player) {
            return true;
        }
    }
    return false;
}

function restartGame() {
    currentPlayer = "X";
    board = ["", "", "", "", "", "", "", "", ""];
    statusMessage.textContent = `${players[currentPlayer]}'s turn`;
    gameActive = true;
    resetTimers();
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("x-mark", "o-mark");
    });
}

// Initialization
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', restartGame);