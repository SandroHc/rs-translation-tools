FROM node:14-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Bundle app source
COPY . .
COPY .env.docker ./.env

EXPOSE 3000
CMD [ "node", "./bin/www" ]