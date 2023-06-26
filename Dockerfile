FROM node:14.0.0-alpine
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .

# EXPOSE 3000
# ENV NODE_ENV=production
# CMD [ "npm", "run", "start:dev" ]
