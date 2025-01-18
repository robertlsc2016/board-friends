const socket = io();

// Elementos do DOM
const loginDiv = document.getElementById("loginDiv");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");
const canvas = document.getElementById("board");
const context = canvas.getContext("2d");
const usersDiv = document.getElementById("users");
const clearBtn = document.getElementById("clearBtn"); // Referência ao botão de limpeza

// Ajustar o tamanho do canvas
function resizeCanvas() {
  canvas.width = 360;
  canvas.height = 500;
}
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);
const playersList = document.getElementById("playersList");
window.scrollTo(0, 0);

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

// Funções auxiliares para obter posições
function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function getTouchPos(touch) {
  if (!touch) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}

// Manipuladores de eventos de mouse
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const pos = getMousePos(e);
  current.x = pos.x;
  current.y = pos.y;
});

canvas.addEventListener("mouseup", (e) => {
  if (!drawing) return;
  drawing = false;
  const pos = getMousePos(e);
  drawLine(current.x, current.y, pos.x, pos.y, color, username, true);
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const pos = getMousePos(e);
  drawLine(current.x, current.y, pos.x, pos.y, color, username, true);
  current.x = pos.x;
  current.y = pos.y;

  // Emitir movimento do cursor
  emitCursorMove(e.clientX, e.clientY);
});

// Manipuladores de eventos de toque
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault(); // Evita comportamentos padrões, como rolagem
    if (e.touches.length > 0) {
      drawing = true;
      const pos = getTouchPos(e.touches[0]);
      current.x = pos.x;
      current.y = pos.y;
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    if (!drawing) return;
    drawing = false;
    if (e.changedTouches.length > 0) {
      const pos = getTouchPos(e.changedTouches[0]);
      drawLine(current.x, current.y, pos.x, pos.y, color, username, true);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (!drawing) return;
    if (e.touches.length > 0) {
      const pos = getTouchPos(e.touches[0]);
      drawLine(current.x, current.y, pos.x, pos.y, color, username, true);
      current.x = pos.x;
      current.y = pos.y;

      // Emitir movimento do cursor
      emitCursorMove(
        pos.x + canvas.getBoundingClientRect().left,
        pos.y + canvas.getBoundingClientRect().top
      );
    }
  },
  { passive: false }
);

// Função para emitir movimento do cursor
function emitCursorMove(clientX, clientY) {
  if (username !== "") {
    const cursorData = { x: clientX, y: clientY, name: username };
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
    userLabel.style.left = `${clientX + 10}px`; // Ajuste o deslocamento da etiqueta
    userLabel.style.top = `${clientY + 10}px`; // Ajuste o deslocamento da etiqueta
  }
}

// Função para limpar o canvas
function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// Event Listener para o botão de limpeza
clearBtn.addEventListener("click", () => {
  socket.emit("clearCanvas");
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

// Escutar evento 'clearCanvas' do servidor para limpar o canvas
socket.on("clearCanvas", () => {
  clearCanvas();
});

// Receber a lista de jogadores
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
  label.style.color = data.color || "#000"; // Opcional: definir cor do usuário
  usersDiv.appendChild(label);
  userLabels[data.id] = label;
});

// Atualizar posição das etiquetas
socket.on("cursorMove", (data) => {
  const label = document.getElementById(`label-${data.id}`);
  if (label) {
    label.style.left = `${data.cursor.x}px`;
    label.style.top = `${data.cursor.y}px`;
    label.textContent = data.name; // Certifique-se de exibir apenas o nome
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
