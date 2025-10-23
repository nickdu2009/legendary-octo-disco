# MiniFlow Backend Makefile

# Variables
BINARY_NAME=miniflow
MAIN_PATH=./cmd/server
BUILD_DIR=./build
CONFIG_PATH=./config

# Default target
.DEFAULT_GOAL := help

# Build the application
.PHONY: build
build: ## Build the application
	@echo "Building $(BINARY_NAME)..."
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build completed: $(BUILD_DIR)/$(BINARY_NAME)"

# Run the application
.PHONY: run
run: ## Run the application
	@echo "Running $(BINARY_NAME)..."
	@go run $(MAIN_PATH) -config $(CONFIG_PATH)

# Clean build artifacts
.PHONY: clean
clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(BINARY_NAME)
	@echo "Clean completed"

# Download dependencies
.PHONY: deps
deps: ## Download dependencies
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy
	@echo "Dependencies updated"

# Generate Wire code
.PHONY: wire
wire: ## Generate Wire dependency injection code
	@echo "Generating Wire code..."
	@wire ./internal/wire
	@echo "Wire code generated"

# Generate all code
.PHONY: generate
generate: wire ## Generate all code (Wire, etc.)
	@echo "Code generation completed"

# Run tests
.PHONY: test
test: ## Run tests
	@echo "Running tests..."
	@go test -v ./...

# Run tests with coverage
.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Format code
.PHONY: fmt
fmt: ## Format code
	@echo "Formatting code..."
	@go fmt ./...

# Lint code
.PHONY: lint
lint: ## Lint code
	@echo "Linting code..."
	@golangci-lint run

# Docker build
.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t miniflow:latest .

# Docker run
.PHONY: docker-run
docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run -p 8080:8080 --name miniflow-container miniflow:latest

# Start development environment
.PHONY: dev-up
dev-up: ## Start development environment with Docker Compose
	@echo "Starting development environment..."
	@cd .. && docker-compose up -d mysql redis

# Stop development environment
.PHONY: dev-down
dev-down: ## Stop development environment
	@echo "Stopping development environment..."
	@cd .. && docker-compose down

# Database migration
.PHONY: migrate
migrate: ## Run database migrations
	@echo "Running database migrations..."
	@go run $(MAIN_PATH) -config $(CONFIG_PATH) -migrate

# Help
.PHONY: help
help: ## Show help message
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
