# -------- Build stage --------
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
RUN pnpm install --frozen-lockfile=false

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# -------- Runtime stage --------
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# Only prod deps
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
RUN pnpm install --prod --frozen-lockfile=false

COPY --from=build /app/dist ./dist

# Copy env at runtime via docker run -e or secrets; don't bake .env
EXPOSE 3000
CMD ["node", "dist/server.js"]
