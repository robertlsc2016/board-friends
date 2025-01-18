const express = require("express");
const app = express();
const http = require("http");
const https = require("https");
const fs = require("fs"); // Adicionei a importação do fs para ler os arquivos do certificado

// Lendo os certificados SSL
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/board-friends.duckdns.org/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/board-friends.duckdns.org/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/board-friends.duckdns.org/chain.pem",
  "utf8"
);

const credentials = { key: privateKey, cert: certificate, ca: ca };

// Criando o servidor HTTPS
const server = https.createServer(credentials, app);
const io = require("socket.io")(server);

const port = process.env.PORT || 5000;

// Servir arquivos estáticos da pasta 'public'
app.use(express.static("public"));

// Objeto para armazenar informações dos usuários
const users = {};

// Array para armazenar o histórico de desenhos
let drawingData = [];

// Função para transmitir a lista atualizada de jogadores para todos os clientes
function broadcastPlayers() {
  const playerList = Object.keys(users).map((id) => ({
    id,
    name: users[id].name,
    color: users[id].color,
  }));
  io.emit("updatePlayers", playerList);
}

io.on("connection", (socket) => {
  console.log("Um usuário conectou:", socket.id);

  // Quando o cliente define o nome e a cor
  socket.on("setName", (data) => {
    const { name, color } = data;
    users[socket.id] = { name, color, cursor: { x: 0, y: 0 } };

    // Emitir evento 'userJoined' para todos os clientes
    io.emit("userJoined", { id: socket.id, name, color });

    // Atualizar a lista de jogadores para todos os clientes
    broadcastPlayers();

    // Enviar o histórico de desenhos para o novo cliente
    socket.emit("loadDrawing", drawingData);
  });

  // Solicitação para obter a lista atual de jogadores
  socket.on("requestPlayers", () => {
    broadcastPlayers();
  });

  // Receber dados de desenho e retransmitir para todos
  socket.on("drawing", (data) => {
    drawingData.push(data); // Armazenar o desenho no histórico
    io.emit("drawing", data); // Retransmitir para todos os clientes
  });

  // Receber posição do cursor e retransmitir para todos
  socket.on("cursorMove", (data) => {
    if (users[socket.id]) {
      users[socket.id].cursor = data; // Atualizar posição do cursor do usuário
      io.emit("cursorMove", {
        id: socket.id,
        name: users[socket.id].name,
        cursor: data,
      });
    }
  });

  // Escutar evento 'clearCanvas' do cliente
  socket.on("clearCanvas", () => {
    console.log(`Quadro limpo por: ${users[socket.id].name} (${socket.id})`);
    drawingData = []; // Limpar o histórico de desenhos no servidor

    // Emitir evento 'clearCanvas' para todos os clientes
    io.emit("clearCanvas");
  });

  // Quando o cliente desconecta
  socket.on("disconnect", () => {
    console.log("Um usuário desconectou:", socket.id);
    if (users[socket.id]) {
      // Emitir evento 'userLeft' para todos os clientes
      io.emit("userLeft", {
        id: socket.id,
        name: users[socket.id].name,
      });

      // Remover o usuário do objeto 'users'
      delete users[socket.id];

      // Atualizar a lista de jogadores para todos os clientes
      broadcastPlayers();
    }
  });
});

// Servindo o servidor HTTPS na porta configurada
server.listen(port, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${port}`);
});
