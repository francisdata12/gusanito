const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextTargetDisplay = document.getElementById('next-target');
const maxTargetDisplay = document.getElementById('max-target');
const scoreDisplay = document.getElementById('score');
const messageElement = document.getElementById('message');
const gameTitle = document.getElementById('game-title');
const labelMeta = document.getElementById('label-meta');

// Leer el modo seleccionado en la URL (ej. ?modo=vocales o ?modo=abecedario)
const urlParams = new URLSearchParams(window.location.search);
const gameMode = urlParams.get('modo') || 'numeros';

// Configurar catálogos según el modo elegido
let sequenceList = [];
let currentIndex = 0;
let batchSize = 5; // Cantidad de elementos visibles a la vez en pantalla

if (gameMode === 'vocales') {
    sequenceList = ['A', 'E', 'I', 'O', 'U'];
    batchSize = 5;
    gameTitle.textContent = "🐛 Gusanito de Vocales 🅰️";
    labelMeta.style.display = 'none'; // No se necesita meta numérica
} else if (gameMode === 'abecedario') {
    sequenceList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    batchSize = 5;
    gameTitle.textContent = "🐛 Gusanito Alfabético 📚";
    labelMeta.style.display = 'none';
} else {
    // Números por defecto
    sequenceList = Array.from({length: 50}, (_, i) => i + 1);
    batchSize = 5;
    gameTitle.textContent = "🐛 Gusanito Numérico 🔢";
    labelMeta.style.display = 'block';
}

const gridSize = 20;
let worm = [];
let dx = gridSize;
let dy = 0;
let nextDx = gridSize;
let nextDy = 0;
let gameInterval = null;
let gameOver = false;
let isPaused = false;
let itemsOnBoard = [];
let eatenQueue = [];
let pulseTimer = 0;

const itemColors = [
    '#ef4444', '#f97316', '#eab308', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

function initGame() {
    if (gameInterval) clearInterval(gameInterval);
    
    currentIndex = 0;
    gameOver = false;
    isPaused = false;
    dx = gridSize;
    dy = 0;
    nextDx = gridSize;
    nextDy = 0;
    eatenQueue = [];
    pulseTimer = 0;

    worm = [
        { x: 140, y: 140 },
        { x: 120, y: 140 },
        { x: 100, y: 140 }
    ];

    updateUI();
    messageElement.textContent = "¡Busca el elemento que está palpitando!";
    messageElement.style.color = "#047857";

    spawnBatchItems();
    gameInterval = setInterval(gameLoop, 200);
}

function spawnBatchItems() {
    itemsOnBoard = [];
    let endIdx = Math.min(currentIndex + batchSize, sequenceList.length);
    
    // Tomar el bloque actual de elementos (ej. 1 al 5, o A a E)
    for (let i = currentIndex; i < endIdx; i++) {
        let val = sequenceList[i];
        let pos;
        let safe;
        do {
            safe = true;
            pos = {
                value: val,
                color: itemColors[(i) % itemColors.length],
                x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
                y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
            };
            for (let part of worm) {
                if (part.x === pos.x && part.y === pos.y) safe = false;
            }
            for (let n of itemsOnBoard) {
                if (n.x === pos.x && n.y === pos.y) safe = false;
            }
        } while (!safe);
        itemsOnBoard.push(pos);
    }
}

function updateUI() {
    if (gameMode === 'numeros') {
        maxTargetDisplay.textContent = Math.min(currentIndex + batchSize, sequenceList.length);
    }
    nextTargetDisplay.textContent = sequenceList[currentIndex];
    scoreDisplay.textContent = eatenQueue.length;
}

window.addEventListener('keydown', e => {
    if (isPaused) return;
    switch (e.key) {
        case 'ArrowUp':
            if (dy === 0) { nextDx = 0; nextDy = -gridSize; }
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (dy === 0) { nextDx = 0; nextDy = gridSize; }
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (dx === 0) { nextDx = -gridSize; nextDy = 0; }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (dx === 0) { nextDx = gridSize; nextDy = 0; }
            e.preventDefault();
            break;
    }
});

function changeDirection(dir) {
    if (isPaused || gameOver) return;
    if (dir === 'UP' && dy === 0) { nextDx = 0; nextDy = -gridSize; }
    if (dir === 'DOWN' && dy === 0) { nextDx = 0; nextDy = gridSize; }
    if (dir === 'LEFT' && dx === 0) { nextDx = -gridSize; nextDy = 0; }
    if (dir === 'RIGHT' && dx === 0) { nextDx = gridSize; nextDy = 0; }
}

function gameLoop() {
    if (gameOver || isPaused) return;

    dx = nextDx;
    dy = nextDy;

    const head = { x: worm[0].x + dx, y: worm[0].y + dy };

    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        endGame("🐛💥 ¡Chocó! Reiniciando partida...");
        return;
    }

    for (let i = 0; i < worm.length; i++) {
        if (head.x === worm[i].x && head.y === worm[i].y) {
            endGame("🐛💥 ¡Se enredó! Reiniciando partida...");
            return;
        }
    }

    worm.unshift(head);

    let eatenIndex = itemsOnBoard.findIndex(n => n.x === head.x && n.y === head.y);

    if (eatenIndex !== -1) {
        let eatenVal = itemsOnBoard[eatenIndex].value;
        let expectedVal = sequenceList[currentIndex];

        if (eatenVal === expectedVal) {
            itemsOnBoard.splice(eatenIndex, 1);
            eatenQueue.push(eatenVal); 
            currentIndex++;
            updateUI();

            // Verificar si completó toda la lista o el bloque actual
            if (currentIndex >= sequenceList.length) {
                clearInterval(gameInterval);
                messageElement.textContent = "🏆 ¡INCREÍBLE! ¡Completaste todo el juego!";
                messageElement.style.color = "#059669";
                gameOver = true;
                setTimeout(() => initGame(), 4000);
                return;
            }

            if (itemsOnBoard.length === 0) {
                messageElement.textContent = `🎉 ¡Bloque superado! Siguiente ronda...`;
                messageElement.style.color = "#059669";
                gameOver = true;
                clearInterval(gameInterval);

                setTimeout(() => {
                    gameOver = false;
                    updateUI();
                    spawnBatchItems();
                    messageElement.textContent = `¡Sigue buscando el siguiente!`;
                    gameInterval = setInterval(gameLoop, 200);
                }, 1500);
            } else {
                messageElement.textContent = `¡Muy bien! Comiste el ${eatenVal}. ¡Ahora busca el que palpita!`;
                messageElement.style.color = "#047857";
            }
        } else {
            endGame(`🐛💥 ¡Ups! Comiste el ${eatenVal} y buscabas el ${expectedVal}. Reiniciando...`);
            return;
        }
    } else {
        worm.pop(); 
    }

    pulseTimer += 0.25;
    drawGame();
}

function endGame(msg) {
    gameOver = true;
    clearInterval(gameInterval);
    messageElement.textContent = msg;
    messageElement.style.color = "#ef4444";
    drawGame();

    // Reinicio automático al perder tras 2 segundos
    setTimeout(() => {
        initGame();
    }, 2000);
}

function pauseGame() {
    if (gameOver || isPaused) return;
    isPaused = true;
    clearInterval(gameInterval);
    messageElement.textContent = "⏸️ Juego pausado. Presiona Play.";
    messageElement.style.color = "#d97706";
}

function resumeGame() {
    if (gameOver || !isPaused) return;
    isPaused = false;
    messageElement.textContent = "▶️ ¡Continuamos!";
    messageElement.style.color = "#047857";
    gameInterval = setInterval(gameLoop, 200);
}

function exitGame() {
    if (gameInterval) clearInterval(gameInterval);
    window.location.href = "index.html"; // Regresa al menú principal
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    itemsOnBoard.forEach(n => {
        let radius = 13;
        if (n.value === sequenceList[currentIndex]) {
            let pulse = Math.sin(pulseTimer) * 3;
            radius = 14 + pulse;
        }

        ctx.beginPath();
        ctx.arc(n.x + gridSize / 2, n.y + gridSize / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.value, n.x + gridSize / 2, n.y + gridSize / 2);
    });

    for (let i = 1; i < worm.length; i++) {
        let wobble = Math.sin(pulseTimer + i * 0.5) * 1.5;
        let segmentRadius = 9.5 + wobble;

        ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#16a34a';
        ctx.beginPath();
        ctx.arc(worm[i].x + gridSize / 2, worm[i].y + gridSize / 2, segmentRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#14532d';
        ctx.stroke();

        let queueIndex = eatenQueue.length - (worm.length - i);
        if (queueIndex >= 0 && queueIndex < eatenQueue.length) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(eatenQueue[queueIndex], worm[i].x + gridSize / 2, worm[i].y + gridSize / 2);
        }
    }

    if (worm.length > 0) {
        let head = worm[0];
        let hx = head.x + gridSize / 2;
        let hy = head.y + gridSize / 2;

        let antennaWobble = Math.cos(pulseTimer * 2) * 2;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy - 8); ctx.lineTo(hx - 8 + antennaWobble, hy - 16);
        ctx.moveTo(hx + 4, hy - 8); ctx.lineTo(hx + 8 + antennaWobble, hy - 16);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(hx - 8 + antennaWobble, hy - 16, 2.5, 0, Math.PI * 2);
        ctx.arc(hx + 8 + antennaWobble, hy - 16, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(hx, hy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#14532d';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx - 4, hy - 3, 3, 0, Math.PI * 2);
        ctx.arc(hx + 4, hy - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(hx - 4, hy - 3, 1.2, 0, Math.PI * 2);
        ctx.arc(hx + 4, hy - 3, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
}

initGame();