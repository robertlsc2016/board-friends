const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 5000;

// Servir arquivos estáticos da pasta 'public'
app.use(express.static("public"));

// Objeto para armazenar informações dos usuários
const users = {};

const drawingData = [];

function broadcastPlayers() {
  const playerNames = Object.values(users).map((user) => user.name);
  io.emit("updatePlayers", playerNames);
}

io.on("connection", (socket) => {
  console.log("Um usuário conectou:", socket.id);

  // Quando o cliente define o nome
  socket.on("setName", (name) => {
    users[socket.id] = { name: name, cursor: { x: 0, y: 0 } };
    broadcastPlayers(); // Atualizar todos os clientes
  });

  socket.on("requestPlayers", () => {
    broadcastPlayers();
  });

  // Quando o cliente desconecta
  socket.on("disconnect", () => {
    console.log("Um usuário desconectou:", socket.id);
    delete users[socket.id];
    broadcastPlayers(); // Atualizar todos os clientes
  });

  // Enviar o desenho já existente para o novo cliente
  socket.emit("loadDrawing", drawingData);

  // Receber dados de desenho e retransmitir para todos
  socket.on("drawing", (data) => {
    drawingData.push(data); // Armazenar o desenho
    io.emit("drawing", data);
  });

  // Receber posição do cursor e retransmitir para todos
  socket.on("cursorMove", (data) => {
    if (users[socket.id]) {
      users[socket.id].cursor = data;
      socket.broadcast.emit("cursorMove", {
        id: socket.id,
        name: users[socket.id].name,
        cursor: data,
      });
    }
  });

  // Remover usuário ao desconectar
  socket.on("disconnect", () => {
    console.log("Um usuário desconectou:", socket.id);
    if (users[socket.id]) {
      socket.broadcast.emit("userLeft", {
        id: socket.id,
        name: users[socket.id].name,
      });
      delete users[socket.id];
    }
  });
});

http.listen(port, () => {
  console.log(`Servidor rodando na porta ${5000}`);
});
