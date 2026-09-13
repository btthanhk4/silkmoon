# Multi-stage build for SilkMoon Frontend (Vite + React)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build Vite application for production
ARG VITE_API_URL=/api/v1
ARG VITE_AR_SERVICE_URL=/ar
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AR_SERVICE_URL=$VITE_AR_SERVICE_URL

RUN npm run build

# Production Nginx runtime
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
