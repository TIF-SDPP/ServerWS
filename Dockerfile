# Imagen base liviana con Node.js
FROM node:23-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json si existe
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto que use tu server.js (ajustalo si es otro)
EXPOSE 80

# Comando para ejecutar tu servidor
CMD ["node", "server.js"]
