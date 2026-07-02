# Build context is the repo root (see deploy/docker-compose.yml) so this stage
# can reach both frontend/ and deploy/nginx.conf.
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
