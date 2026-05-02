// --- DOM Elements ---
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameModeSelect = document.getElementById('gameMode');
const playerONameInput = document.getElementById('playerOName');
const difficultySettings = document.getElementById('difficultySettings');
const difficultySelect = document.getElementById('difficulty');
const startGameBtn = document.getElementById('startGameBtn');
const cells = document.querySelectorAll('.cell');
const statusMessage = document.getElementById('statusMessage');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const themeToggleMenuBtn = document.getElementById('themeToggleMenuBtn');
const themeToggleGameBtn = document.getElementById('themeToggleGameBtn');

// --- Game State Variables ---
let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = false;
let mode = "pvp"; 
let difficulty = "easy";
let players = { X: "Player 1", O: "Player 2" };

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], 
    [0, 3, 6], [1, 4, 7], [2, 5, 8], 
    [0, 4, 8], [2, 4, 6]             
];

// --- Theme Toggling ---
function toggleTheme() {
    const rootElement = document.documentElement; 
    const currentTheme = rootElement.getAttribute('data-theme');
    const isDark = currentTheme === 'dark';
    
    if (isDark) {
        rootElement.removeAttribute('data-theme');
        themeToggleMenuBtn.textContent = "Toggle Theme 🌙";
        themeToggleGameBtn.textContent = "Theme 🌙";
    } else {
        rootElement.setAttribute('data-theme', 'dark');
        themeToggleMenuBtn.textContent = "Toggle Theme ☀️";
        themeToggleGameBtn.textContent = "Theme ☀️";
    }
}
themeToggleMenuBtn.addEventListener('click', toggleTheme);
themeToggleGameBtn.addEventListener('click', toggleTheme);

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
    
    setupScreen.style.display = "none";
    gameScreen.style.display = "block";
    restartGame();
});

menuButton.addEventListener('click', () => {
    gameScreen.style.display = "none";
    setupScreen.style.display = "block";
    gameActive = false;
});

// --- Gameplay Logic ---
function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    if (board[clickedCellIndex] !== "" || !gameActive || (mode === 'pve' && currentPlayer === "O")) {
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
        return;
    }

    if (!board.includes("")) {
        statusMessage.textContent = "Game ended in a draw!";
        gameActive = false;
        return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusMessage.textContent = `${players[currentPlayer]}'s turn`;

    if (mode === 'pve' && currentPlayer === "O" && gameActive) {
        setTimeout(makeAIMove, 500); 
    }
}

// --- AI Logic ---
function makeAIMove() {
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
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("x-mark", "o-mark");
    });
}

// Initialization
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', restartGame);