let selectedTank = null;

document.querySelectorAll(".tank-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tank-button").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
    selectedTank = button.getAttribute("data-type");
  });
});

document.getElementById("play-button").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();

  if (!username) {
    alert("Please enter a username!");
    return;
  }

  if (!selectedTank) {
    alert("Please select a tank type!");
    return;
  }

  // Hide home screen and show canvas
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("gameCanvas").style.display = "block";

  // Start game with username and selectedTank
  console.log("Starting game with:", username, selectedTank);
  startGame(username, selectedTank);
});

function startGame(username, tankType) {
  // Replace this with your actual WebSocket setup and game loop
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "30px sans-serif";
  ctx.fillText(`Welcome ${username} the ${tankType}`, 50, 100);
}
