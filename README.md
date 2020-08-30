# RS Translation Tools

Web application for finding translations for in-game data for the RuneScape game.


## Development

As a prerequisite, install [Node.js](https://nodejs.org) (tested only with version 12.16.1). You will also need [Yarn v1](https://classic.yarnpkg.com/en/docs/install).

First, download all the dependencies by running `yarn install` on the project directory.

Now you can start the Node server locally by typing `yarn start`. The server will be available at [localhost:8080](http://localhost:8080).


### Docker

Setting up dev environment:
* `docker-compose build`
* `docker-compose -p rs-translations up -d web db`

Building and pushing a new image:
* `docker-compose build`
* `docker image tag rs-translations rs-translations:latest`
* `docker push rs-translations:latest`

Building and testing a local image:
* `docker build -t rs-translations .`
* `docker run -it --rm rs-translations`