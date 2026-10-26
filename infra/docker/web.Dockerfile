FROM node:24.11.1-bookworm-slim AS build
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -s /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci
COPY apps/web/ ./
ARG API_INTERNAL_URL=http://api:8000
ARG NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=false
ARG NEXT_PUBLIC_J2ME_RUNTIME_ORIGIN=
ARG NEXT_PUBLIC_LAUNCHER_ORIGIN=
# Safe default for middleware allowlist enforcement (override at runtime via compose env).
ARG NEXT_PUBLIC_RBG_CORE_PROVISION_MODE=PUBLIC_BROWSER
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=${NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN}
ENV NEXT_PUBLIC_J2ME_RUNTIME_ORIGIN=${NEXT_PUBLIC_J2ME_RUNTIME_ORIGIN}
ENV NEXT_PUBLIC_LAUNCHER_ORIGIN=${NEXT_PUBLIC_LAUNCHER_ORIGIN}
ENV NEXT_PUBLIC_RBG_CORE_PROVISION_MODE=${NEXT_PUBLIC_RBG_CORE_PROVISION_MODE}
RUN npm run build

FROM node:24.11.1-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
ENV RBG_PRIVATE_ASSET_DIR=/private-runtime
ENV RBG_CORE_PROVISION_MODE=PUBLIC_BROWSER
WORKDIR /app
RUN useradd --create-home --uid 10001 retro
COPY --from=build --chown=retro:retro /app/.next/standalone ./
COPY --from=build --chown=retro:retro /app/.next/static ./.next/static
COPY --from=build --chown=retro:retro /app/public ./public
# Emulator .data/.wasm are provisioned at runtime from RBG_PRIVATE_ASSET_DIR (not baked into the image).
COPY --chown=retro:retro scripts/web-entrypoint.sh /app/web-entrypoint.sh
COPY --chown=retro:retro scripts/sync-private-cores.mjs /app/sync-private-cores.mjs
COPY --chown=retro:retro docs/open-source/browser-distributable-allowlist.json /app/policy/browser-distributable-allowlist.json
RUN chmod 755 /app/web-entrypoint.sh
USER retro
EXPOSE 3000
CMD ["/app/web-entrypoint.sh"]
