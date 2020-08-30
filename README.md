# RS Translation Tools

Web application for finding translations for in-game data for the RuneScape game.


## Development

You will need [Node.js](https://nodejs.org) installed (tested only with version 12.16.1).

To run the Node server locally type `npm start`. The server will be available at [localhost:8080](http://localhost:8080).


### Docker

Setting up dev environment:
* `docker-compose build`
* `docker-compose -p rs-translations up -d web db`

Building and pushing a new image:
* `docker-compose build`
* `docker image tag rs-translations:latest`
* `docker push rs-translations:latest`

Building and testing a local image:
* `docker build -t rs-translations .`
* `docker run -it --rm rs-translations`