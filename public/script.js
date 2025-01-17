const socket = io();

// Elementos do DOM
const loginDiv = document.getElementById("loginDiv");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");
const canvas = document.getElementById("board");
const context = canvas.getContext("2d");
const usersDiv = document.getElementById("users");

// Ajustar o tamanho do canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);
const playersList = document.getElementById("playersList");

// Variáveis de desenho
let drawing = false;
let current = { x: 0, y: 0 };

let username = "";

let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Cor aleatória

const colorPicker = document.getElementById("colorPicker");
colorPicker.value = color; // Define a cor inicial
colorPicker.addEventListener("input", (e) => {
  color = e.target.value; // Atualiza a cor ao selecionar
});

// Objeto para armazenar as etiquetas dos outros usuários
const userLabels = {};

// Login
joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (name !== "") {
    username = name;
    socket.emit("setName", { name, color }); // Enviar nome e cor para o servidor
    loginDiv.style.display = "none";
    canvas.style.display = "block";
    menu.style.display = "flex";
  }
});

// Funções de desenho
function drawLine(x0, y0, x1, y1, lineColor, usernameLabel, emit) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = lineColor;
  context.lineWidth = 4; // Linha mais grossa
  context.stroke();
  context.closePath();

  if (!emit) {
    return;
  }

  const w = canvas.width;
  const h = canvas.height;

  socket.emit("drawing", {
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    color: lineColor,
    username: usernameLabel,
  });
}

// Atualize a cor ao desenhar
canvas.addEventListener("mousemove", (e) => {
  if (!drawing) {
    return;
  }
  drawLine(current.x, current.y, e.clientX, e.clientY, color, username, true);
  current.x = e.clientX;
  current.y = e.clientY;
});

// Evento de início de desenho
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  current.x = e.clientX;
  current.y = e.clientY;
});

// Evento de término de desenho
canvas.addEventListener("mouseup", (e) => {
  if (!drawing) {
    return;
  }
  drawing = false;
  drawLine(current.x, current.y, e.clientX, e.clientY, "black", username, true);
});

// Evento de movimento do mouse para desenhar
canvas.addEventListener("mousemove", (e) => {
  if (!drawing) {
    return;
  }
  drawLine(current.x, current.y, e.clientX, e.clientY, "black", username, true);
  current.x = e.clientX;
  current.y = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
  if (username !== "") {
    const cursorData = { x: e.clientX, y: e.clientY };
    socket.emit("cursorMove", cursorData);

    // Atualizar posição da etiqueta do próprio usuário
    let userLabel = userLabels[socket.id];
    if (!userLabel) {
      // Criar a etiqueta para o próprio usuário
      userLabel = document.createElement("div");
      userLabel.className = "user-label";
      userLabel.id = `label-${socket.id}`;
      userLabel.innerText = username;
      userLabel.style.color = color; // Usa a cor escolhida pelo próprio usuário
      usersDiv.appendChild(userLabel);
      userLabels[socket.id] = userLabel;
    }
    userLabel.style.left = `${e.clientX + 10}px`; // Ajuste o deslocamento da etiqueta
    userLabel.style.top = `${e.clientY + 10}px`; // Ajuste o deslocamento da etiqueta
  }
});

// Receber dados de desenho
socket.on("drawing", (data) => {
  const w = canvas.width;
  const h = canvas.height;
  drawLine(
    data.x0 * w,
    data.y0 * h,
    data.x1 * w,
    data.y1 * h,
    data.color, // Cor enviada pelo outro usuário
    data.username,
    false
  );
});

function updatePlayersList(players) {
  playersList.innerHTML = ""; // Limpar lista atual
  players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name; // Acesse a propriedade correta (name)
    playersList.appendChild(li);
  });
}

socket.on("updatePlayers", (players) => {
  updatePlayersList(players);
});

socket.emit("requestPlayers");

// Gerenciar etiquetas de outros usuários
socket.on("userJoined", (data) => {
  const label = document.createElement("div");
  label.className = "user-label";
  label.id = `label-${data.id}`;
  label.innerText = data.name; // Usar apenas a propriedade name
  usersDiv.appendChild(label);
  userLabels[data.id] = label;
});

// Atualizar posição das etiquetas
socket.on("cursorMove", (data) => {
  console.log(data);
  const label = document.getElementById(`label-${data.id}`);
  if (label) {
    label.style.left = `${data.cursor.x}px`;
    label.style.top = `${data.cursor.y}px`;
    label.textContent = data.name.name; // Certifique-se de exibir apenas o nome
  }
});

// Limpeza das etiquetas ao desconectar
socket.on("disconnect", () => {
  // Opcional: limpar todas as etiquetas (já estamos removendo ao 'userLeft')
});

// Adicionar etiquetas para os usuários e seus nomes
function updateLabelPosition(id, x, y, name) {
  let label = userLabels[id];

  // Cria a etiqueta caso não exista
  if (!label) {
    label = document.createElement("div");
    label.className = "user-label";
    label.id = `label-${id}`;
    label.innerText = name; // Nome do usuário
    usersDiv.appendChild(label);
    userLabels[id] = label;
  }

  // Atualiza a posição da etiqueta
  label.style.left = `${x + 10}px`; // Um pequeno deslocamento para não cobrir o cursor
  label.style.top = `${y}px`;
}

// Evento de movimento para o próprio cursor
canvas.addEventListener("mousemove", (e) => {
  if (username !== "") {
    const cursorData = { x: e.clientX, y: e.clientY, name: username };
    socket.emit("cursorMove", cursorData);
  }
});

// Atualizar posição das etiquetas de outros usuários
socket.on("cursorMove", (data) => {
  updateLabelPosition(data.id, data.cursor.x, data.cursor.y, data.name);
});

socket.on("loadDrawing", (data) => {
  data.forEach((line) => {
    const w = canvas.width;
    const h = canvas.height;
    drawLine(
      line.x0 * w,
      line.y0 * h,
      line.x1 * w,
      line.y1 * h,
      line.color,
      line.username,
      false
    );
  });
});

// Remover etiquetas de usuários desconectados
socket.on("userLeft", (data) => {
  console.log(`Usuário desconectou: ${data.name}`);
  const label = document.getElementById(`label-${data.id}`);
  if (label) {
    usersDiv.removeChild(label);
    delete userLabels[data.id];
  }
});
