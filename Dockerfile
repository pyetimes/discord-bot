FROM node:22.17 AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install
RUN npx prisma generate

COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22.17 AS runner
WORKDIR /app

# COPY package.json pnpm-lock.yaml ./
# RUN pnpm install --prod

COPY --from=builder /app/dist ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
# ENV DATABASE_URL=postgres://user:password@host:port/name

ENTRYPOINT ["sh", "-c"]
CMD ["npx prisma migrate deploy && node build/src/index.js"]
