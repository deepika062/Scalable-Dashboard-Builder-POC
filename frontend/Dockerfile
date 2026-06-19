# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json ./frontend/package.json
RUN cd frontend && npm install

# Source + shared contract (imported via @shared alias)
COPY frontend ./frontend
COPY shared ./shared

WORKDIR /app/frontend
RUN npm run build

# --- serve stage ---
FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
