FROM node:24.11.1-bookworm-slim AS build
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

FROM node:24.11.1-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN useradd --create-home --uid 10001 retro
COPY --from=build --chown=retro:retro /app/.next/standalone ./
COPY --from=build --chown=retro:retro /app/.next/static ./.next/static
COPY --from=build --chown=retro:retro /app/public ./public
USER retro
EXPOSE 3000
CMD ["node", "server.js"]
