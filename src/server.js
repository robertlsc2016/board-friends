const express = require("express");
const app = express();
const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os"); // Adicionando módulo 'os' para detectar o sistema operacional

// Defina o comportamento dependendo do sistema operacional
let server;

if (os.platform() === "win32") {
  // No Windows, use HTTP
  server = http.createServer(app);
  console.log("Servidor rodando com HTTP no Windows");
} else {
  // Em outros sistemas, use HTTPS
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
  server = https.createServer(credentials, app);
  console.log("Servidor rodando com HTTPS em sistemas não-Windows");
}

const io = require("socket.io")(server);
const port = process.env.PORT || 5000;

// Servir arquivos estáticos da pasta 'public'
app.use(express.static("public"));

// Restante do código do servidor...
// ...

// Servindo o servidor na porta configurada
server.listen(port, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${port}`);
});
