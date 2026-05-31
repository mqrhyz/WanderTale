# Build from the repository root:
#   docker build -f backend/Dockerfile -t wander-tale-api .
FROM mcr.microsoft.com/playwright:v1.60.0-noble AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY packages/hotel-booking-agent/package.json packages/hotel-booking-agent/package.json

RUN pnpm install --frozen-lockfile

COPY backend backend
COPY packages/hotel-booking-agent packages/hotel-booking-agent

RUN pnpm --filter @wander-tale/hotel-booking-agent build \
    && pnpm --filter @wander-tale/api build

FROM mcr.microsoft.com/playwright:v1.60.0-noble AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/packages/hotel-booking-agent/node_modules ./packages/hotel-booking-agent/node_modules
COPY --from=build /app/packages/hotel-booking-agent/dist ./packages/hotel-booking-agent/dist
COPY --from=build /app/packages/hotel-booking-agent/package.json ./packages/hotel-booking-agent/package.json

WORKDIR /app/backend
EXPOSE 8000
CMD ["node", "dist/server.js"]
