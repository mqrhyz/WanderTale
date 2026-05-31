FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

EXPOSE 8000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
