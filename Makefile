# DevStart frontend — build & container automation.
# Override any variable on the command line, e.g.: make docker-run HOST_PORT=3000

IMAGE     ?= devstart-client
TAG       ?= latest
CONTAINER ?= devstart-client
HOST_PORT ?= 8080

# Backend URLs baked into the image at build time. Empty = use Dockerfile defaults.
# Override per environment, e.g.:
#   make docker-build API_URL=https://api.example.com/api WS_URL=wss://ws.example.com/connection/websocket
API_URL ?=
WS_URL  ?=

BUILD_ARGS :=
ifneq ($(API_URL),)
BUILD_ARGS += --build-arg API_URL=$(API_URL)
endif
ifneq ($(WS_URL),)
BUILD_ARGS += --build-arg WS_URL=$(WS_URL)
endif

.DEFAULT_GOAL := help
.PHONY: help install build test docker-build docker-run docker-stop docker-logs clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (ngrx 21 on Angular 19 needs legacy peer deps)
	npm ci --legacy-peer-deps

build: ## Build the production bundle locally into dist/
	npm run build -- --configuration=production

test: ## Run unit tests once in headless Chrome
	npm test -- --watch=false --browsers=ChromeHeadless

docker-build: ## Build the image (override API_URL / WS_URL to point at your backend)
	docker build $(BUILD_ARGS) -t $(IMAGE):$(TAG) .

docker-run: docker-build ## Build the image, then run it (http://localhost:$(HOST_PORT))
	docker run --rm -d --name $(CONTAINER) -p $(HOST_PORT):80 $(IMAGE):$(TAG)
	@echo "DevStart is serving at http://localhost:$(HOST_PORT)"

docker-stop: ## Stop and remove the running container
	-docker stop $(CONTAINER)

docker-logs: ## Follow the container logs
	docker logs -f $(CONTAINER)

clean: ## Remove local build output
	rm -rf dist
