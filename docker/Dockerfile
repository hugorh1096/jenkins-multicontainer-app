FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copiamos tanto el código fuente como las carpetas de pruebas
COPY src/ ./src/
COPY tests/ ./tests/

EXPOSE 3000
CMD ["npm", "start"]
