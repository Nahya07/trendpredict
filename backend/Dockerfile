FROM node:20-alpine AS build
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install
COPY backend ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
COPY backend/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/backend/dist ./dist
COPY database ../database
EXPOSE 4000
CMD ["node", "dist/server.js"]
