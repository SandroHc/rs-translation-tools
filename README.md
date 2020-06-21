# RS Translation Tools

## Docker
Setting up dev environment:
* `docker-compose -p rs-translations up -d mongo sonic`
* `docker-compose -p rs-translations up -d web`

Building and pushing a new API image:
* `docker-compose build`
* `docker image tag rs-translations:latest sandrohc/rs-translations:latest`
* `docker push sandrohc/rs-translations:latest`

Building and testing a local image:
* `docker build -t rs-translations .`
* `docker run -it --rm rs-translations`