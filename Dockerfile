# Usar a imagem oficial do Node.js
FROM node:18

# Criar diretório de trabalho dentro do container
WORKDIR /app

# Copiar os arquivos package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante dos arquivos para o container
COPY . .

# Expor a porta utilizada pela aplicação
EXPOSE 5000

# Comando para iniciar o servidor
CMD ["npm", "start"]
