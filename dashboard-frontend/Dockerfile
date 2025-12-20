# Build stage
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Default nginx configuration is usually enough for a simple Vite SPA, 
# but we can add a custom one if routing needs it.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
