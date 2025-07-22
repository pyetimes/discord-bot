FROM node:22.17 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


FROM node:22.17

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/build ./build

ENV NODE_ENV=production

CMD [ "node", "build/index.js" ]