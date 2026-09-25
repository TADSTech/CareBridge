FROM oven/bun:1.3.14 AS build
WORKDIR /app
ARG VITE_ACCOUNTS_ENABLED=true
ENV VITE_ACCOUNTS_ENABLED=$VITE_ACCOUNTS_ENABLED
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "server/index.mjs"]
