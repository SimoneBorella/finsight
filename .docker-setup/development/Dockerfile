FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]