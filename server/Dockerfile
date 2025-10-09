# ---- build stage (optional if using tsc) ----
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# If you use pnpm, swap to: RUN npm i -g pnpm && pnpm install --frozen-lockfile
RUN npm run build

# ---- runtime stage ----
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
# Koyeb sets PORT; we default to 3000
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/.env.example ./.env.example

# If you need any non-TS assets (public/, views/, etc.) copy them too:
# COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "dist/server.js"]
