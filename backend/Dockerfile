# Backend runs TypeScript directly via tsx (no build step needed for a POC).
FROM node:20-alpine
WORKDIR /app

# Install backend deps
COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --omit=dev && npm install tsx

# Copy source + the shared contract (imported via ../shared)
COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend
# Ensure bare imports inside ../shared (e.g. zod) resolve to the backend's deps.
ENV NODE_PATH=/app/backend/node_modules
EXPOSE 4000
CMD ["npm", "start"]
