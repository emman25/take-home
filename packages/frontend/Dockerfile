FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci

COPY . .

# Build the React application
RUN npm run build

# ---- Production Stage ----
FROM nginx:stable-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
