# syntax=docker/dockerfile:1

# --- build the static bundle ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve it with nginx, proxying /api/ to the gateway ---
FROM nginx:1.30-alpine
ENV GATEWAY_URL=http://gateway:8090
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
