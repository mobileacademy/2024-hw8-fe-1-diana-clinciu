import { difficultyModes, emojis, colors, WIN_MESSAGE, LOSE_MESSAGE, CELL_SIZE } from "./constants.js";

/*
*
* "board" is a matrix that holds data about the
* game board, in a form of BoardSquare objects
*
* openedSquares holds the position of the opened squares
*
* flaggedSquares holds the position of the flagged squares
*
 */
let board = [];
let openedSquares = [];
let flaggedSquares = [];
let bombCount = 0;
let squaresLeft = 0;


/*
*
* the probability of a bomb in each square
*
 */
let bombProbability = 3;
let maxProbability = 15;


function minesweeperGameBootstrapper(difficulty) {
    document.getElementById("settings-form").onsubmit = handleSubmit;

    if (difficulty == null) {
        // display bombProbability and maxProbability
        document.getElementById("bomb-probability").value = bombProbability;
        document.getElementById("max-probability").value = maxProbability;

        generateBoard(difficultyModes.EASY);
    } else {
        resetGame();
        generateBoard(difficultyModes[difficulty]);
    }
}


function resetGame() {
    board = [];
    openedSquares = [];
    flaggedSquares = [];
    bombCount = 0;
    squaresLeft = 0;
    document.getElementById("board").innerHTML = "";
    document.getElementById("message").innerHTML = "";
}


function getNeighbors(cell, boardMetadata) {
    const moves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 1], [1, 0], [1, -1]];

    return moves.map(move => [cell[0] + move[0], cell[1] + move[1]])
        .filter(neighbor => 0 <= neighbor[0] && neighbor[0] < boardMetadata.rowCount &&
            0 <= neighbor[1] && neighbor[1] < boardMetadata.colCount);
}


function discoverCell(cell, boardMetadata) {
    openedSquares.push(cell);
    squaresLeft--;

    //change GUI
    const cellDiv = document.querySelector(`[data-row="${cell[0]}"][data-col="${cell[1]}"]`);
    cellDiv.style.backgroundColor = (cell[0] + cell[1]) % 2 ? colors.LIGHT_BROWN : colors.DARK_BROWN;
    cellDiv.innerHTML = board[cell[0]][cell[1]].hasBomb ? emojis.BOMB : board[cell[0]][cell[1]].bombsAround;

    // remove event listeners
    cellDiv.onclick = null;
    cellDiv.oncontextmenu = null;

    if (board[cell[0]][cell[1]].bombsAround !== 0)
        return;

    getNeighbors(cell, boardMetadata)
        .forEach(neighbor => {
            if (!openedSquares.some(cell => neighbor[0] === cell[0] && neighbor[1] === cell[1])) {
                discoverCell(neighbor, boardMetadata);
            }
        });
}


function endGame(win) {
    // display message
    document.getElementById("message").innerText = win ? WIN_MESSAGE : LOSE_MESSAGE;

    document.querySelectorAll("#board > div").forEach(cell => {
        const { row, col } = getRowAndColumn(cell);

        // freeze cell
        cell.onclick = null;
        cell.oncontextmenu = null;

        // reveal bomb
        if (board[row][col].hasBomb)
            cell.innerHTML = emojis.BOMB;
    });
}


function getRowAndColumn(cell) {
    return { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) };
}


function handleClickOnCell(event, boardMetadata) {
    const { row, col } = getRowAndColumn(event.target);

    discoverCell([row, col], boardMetadata);

    // handle loss
    if (board[row][col].hasBomb) {
        endGame(false);
        return;
    }

    // handle win
    if (squaresLeft == bombCount) {
        endGame(true);
        return;
    }
}


function handleRightClickOnCell(event) {
    event.preventDefault();

    const cell = event.target;
    const { row, col } = getRowAndColumn(cell);

    if (flaggedSquares.some(cell => cell[0] === row && cell[1] === col)) {
        cell.innerHTML = "";
    }
    else {
        cell.innerHTML = emojis.FLAG;
        flaggedSquares.push([row, col]);
    }
}


function generateBoard(boardMetadata) {
    squaresLeft = boardMetadata.rowCount * boardMetadata.colCount;

    /*
    *
    * "generate" an empty matrix
    *
     */
    for (let i = 0; i < boardMetadata.rowCount; i++) {
        board[i] = new Array(boardMetadata.colCount);
    }

    for (let i = 0; i < boardMetadata.rowCount; i++) {
        for (let j = 0; j < boardMetadata.colCount; j++) {
            board[i][j] = new BoardSquare(false, 0);
        }
    }

    /*
    *
    * "place" bombs according to the probabilities declared at the top of the file
    * those could be read from a config file or env variable, but for the
    * simplicity of the solution, I will not do that
    *
    */
    for (let i = 0; i < boardMetadata.rowCount; i++) {
        for (let j = 0; j < boardMetadata.colCount; j++) {
            // TODO place the bomb, you can use the following formula: Math.random() * maxProbability < bombProbability
            if (Math.random() * maxProbability < bombProbability) {
                board[i][j].hasBomb = true;
                board[i][j].bombsAround = Infinity;
                bombCount++;
            }
        }
    }


    // generate board GUI
    const boardDiv = document.getElementById("board");
    boardDiv.style.height = `${(CELL_SIZE * boardMetadata.rowCount).toString()}px`;
    boardDiv.style.width = `${(CELL_SIZE * boardMetadata.colCount).toString()}px`;

    boardDiv.style.gridTemplateRows = "1fr ".repeat(boardMetadata.rowCount);
    boardDiv.style.gridTemplateColumns = "1fr ".repeat(boardMetadata.colCount);

    for (let i = 0; i < boardMetadata.rowCount; i++) {
        for (let j = 0; j < boardMetadata.colCount; j++) {
            const cell = document.createElement("div");

            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.style.backgroundColor = (i + j) % 2 ? colors.LIGHT_GREEN : colors.DARK_GREEN;
            boardDiv.appendChild(cell);

            cell.onclick = (e) => handleClickOnCell(e, boardMetadata);
            cell.oncontextmenu = handleRightClickOnCell;
        }
    }

    for (let i = 0; i < boardMetadata.rowCount; i++) {
        for (let j = 0; j < boardMetadata.colCount; j++) {
            const neighbors = getNeighbors([i, j], boardMetadata);

            neighbors.forEach(cell => {
                if (board[cell[0]][cell[1]].hasBomb) {
                    board[i][j].bombsAround++;
                }
            });
        }
    }

    /*
    *
    * print the board to the console to see the result
    *
    */
    console.log(board);
}


function handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const difficulty = form.elements["dificulty"].value;
    maxProbability = form.elements["maxProbability"].value;
    bombProbability = form.elements["bombProbability"].value;

    minesweeperGameBootstrapper(difficulty);
}

/*
*
* simple object to keep the data for each square
* of the board
*
*/
class BoardSquare {
    constructor(hasBomb, bombsAround) {
        this.hasBomb = hasBomb;
        this.bombsAround = bombsAround;
    }
}


/*
* call the function that "handles the game"
* called at the end of the file, because if called at the start,
* all the global variables will appear as undefined / out of scope
*
 */
minesweeperGameBootstrapper();