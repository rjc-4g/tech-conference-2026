FROM node:lts-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm ci

COPY backend ./backend

EXPOSE 3001

CMD ["npm", "run", "dev", "-w", "backend"]
