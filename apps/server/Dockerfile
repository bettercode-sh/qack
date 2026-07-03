# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY turbo.json ./
COPY packages/typescript-config packages/typescript-config
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm turbo run build --filter=@qack/server...

FROM build AS deploy
RUN pnpm --filter @qack/server deploy /prod/server --prod --legacy

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deploy /prod/server ./
USER node
EXPOSE 8080 2525
CMD ["node", "dist/index.js"]
