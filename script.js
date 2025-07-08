let model, webcamElement;
let classes = [];
const confidenceThreshold = 0.5;

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";

async function loadClasses() {
  const response = await fetch("model/metadata.json");
  const metadata = await response.json();
  classes = metadata.labels;
  console.log("✅ Loaded class labels:", classes);
}

// Load the trained model
async function loadModel() {
  model = await tf.loadLayersModel("model/model.json");
  console.log("✅ Model loaded");
}

//webcam
async function setupWebcam() {
  webcamElement = document.getElementById("webcam");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  webcamElement.srcObject = stream;
  return new Promise((resolve) => {
    webcamElement.onloadedmetadata = () => resolve();
  });
}

// Create the 3x3 board
function createBoard() {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  board.forEach((cell, index) => {
    const div = document.createElement("div");
    div.classList.add("cell");
    div.dataset.index = index;
    div.innerText = cell;
    boardDiv.appendChild(div);
  });
}

// X and O
function placeMove(index, player) {
  if (board[index] === "") {
    board[index] = player;
    createBoard();

    if (checkWinner(player)) {
      alert(`${player} wins!`);
      resetBoard();
    } else if (!board.includes("")) {
      alert("It's a draw!");
      resetBoard();
    } else {
      currentPlayer = player === "X" ? "O" : "X";
      document.getElementById(
        "turn"
      ).innerText = `Current Turn: ${currentPlayer}`;
    }
  }
}

// Reset the board
function resetBoard() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  createBoard();
  document.getElementById("turn").innerText = `Current Turn: ${currentPlayer}`;
}

// Winner declaration
function checkWinner(player) {
  const winCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Cols
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];
  return winCombos.some((combo) => combo.every((i) => board[i] === player));
}

// Main prediction loop
async function predictGesture() {
  const tensor = tf.browser
    .fromPixels(webcamElement)
    .reverse(1)
    .resizeNearestNeighbor([224, 224])
    .toFloat()
    .expandDims();

  const prediction = model.predict(tensor);
  const predictionData = await prediction.data();

  const maxIndex = predictionData.indexOf(Math.max(...predictionData));
  const confidence = predictionData[maxIndex];
  const rawGesture = classes[maxIndex];
  const gesture = rawGesture.split(": ")[1];

  predictionData.forEach((value, i) => {
    const label = classes[i].split(": ")[1];
    console.log(`${label}: ${(value * 100).toFixed(2)}%`);
  });

  if (confidence > confidenceThreshold) {
    document.getElementById("prediction").innerText = `Gesture: ${gesture} (${(
      confidence * 100
    ).toFixed(1)}%)`;
    console.log("✅ Detected:", gesture, "| Confidence:", confidence);

    // Perform action
    const hovered = document.querySelector(".cell:hover");
    if (hovered) {
      const index = parseInt(hovered.dataset.index);
      if (gesture === "X" && currentPlayer === "X") {
        placeMove(index, "X");
      } else if (gesture === "O" && currentPlayer === "O") {
        placeMove(index, "O");
      } else if (gesture === "Reset") {
        resetBoard();
      }
    }
  } else {
    document.getElementById("prediction").innerText = "Gesture: Not sure 🤔";
  }
}

async function main() {
  await loadClasses();
  await loadModel();
  await setupWebcam();
  createBoard();
  document.getElementById("turn").innerText = `Current Turn: ${currentPlayer}`;
  console.log("🎥 Webcam ready");
  setInterval(predictGesture, 1000);
}

main();
