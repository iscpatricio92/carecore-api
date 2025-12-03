.PHONY: help install dev build start stop clean docker-up docker-down docker-logs docker-clean-env db-migrate lint format test

help: ## Mostrar esta ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias
	npm install

dev: ## Iniciar en modo desarrollo
	npm run start:dev

build: ## Compilar el proyecto
	npm run build

start: ## Iniciar en modo producción
	npm run start:prod

stop: ## Detener la aplicación
	@echo "Deteniendo aplicación..."

clean: docker-clean-env ## Limpiar archivos generados
	rm -rf dist node_modules coverage

docker-up: ## Iniciar contenedores Docker (PostgreSQL + Keycloak + API)
	@ENV_BASE=$$(echo .env.$${NODE_ENV:-development}); \
	ENV_LOCAL=.env.local; \
	ENV_COMBINED=.env.docker; \
	COMPOSE_ENV=$$(echo docker-compose.$${NODE_ENV:-development}.yml); \
	echo "📦 Combinando archivos de entorno (igual que NestJS):"; \
	if [ -f "$$ENV_BASE" ]; then \
		echo "   1. Base: $$ENV_BASE"; \
		cat $$ENV_BASE > $$ENV_COMBINED; \
		if [ -f "$$ENV_LOCAL" ]; then \
			echo "   2. Local: $$ENV_LOCAL (sobrescribe valores)"; \
			echo "" >> $$ENV_COMBINED; \
			echo "# Valores de .env.local (sobrescriben valores base)" >> $$ENV_COMBINED; \
			cat $$ENV_LOCAL >> $$ENV_COMBINED; \
		else \
			echo "   2. Local: $$ENV_LOCAL (no existe, usando solo base)"; \
		fi; \
	elif [ -f "$$ENV_LOCAL" ]; then \
		echo "   1. Local: $$ENV_LOCAL (usando solo archivo local)"; \
		cat $$ENV_LOCAL > $$ENV_COMBINED; \
	else \
		echo "⚠️  Error: No se encontró ningún archivo de entorno."; \
		echo "   Crea al menos uno de estos archivos:"; \
		echo "   - $$ENV_BASE (desde $$ENV_BASE.example)"; \
		echo "   - $$ENV_LOCAL (desde $$ENV_BASE.example)"; \
		exit 1; \
	fi; \
	echo "✅ Archivo combinado: $$ENV_COMBINED"; \
	if [ -f "$$COMPOSE_ENV" ]; then \
		echo "🐳 Usando configuración: docker-compose.yml + $$COMPOSE_ENV"; \
		docker-compose -f docker-compose.yml -f $$COMPOSE_ENV --env-file $$ENV_COMBINED up -d; \
	else \
		echo "🐳 Usando configuración: docker-compose.yml (sin override)"; \
		docker-compose --env-file $$ENV_COMBINED up -d; \
	fi; \
	echo "Esperando a que los servicios estén listos..."; \
	sleep 5; \
	echo "✅ PostgreSQL está corriendo en puerto 5432"; \
	echo "✅ Keycloak está corriendo en puerto 8080 (http://localhost:8080)"; \
	echo "✅ API está corriendo en puerto 3000 (http://localhost:3000)"

docker-down: ## Detener contenedores Docker
	@ENV_BASE=$$(echo .env.$${NODE_ENV:-development}); \
	ENV_LOCAL=.env.local; \
	ENV_COMBINED=.env.docker; \
	COMPOSE_ENV=$$(echo docker-compose.$${NODE_ENV:-development}.yml); \
	if [ -f "$$ENV_BASE" ]; then \
		cat $$ENV_BASE > $$ENV_COMBINED; \
		if [ -f "$$ENV_LOCAL" ]; then \
			echo "" >> $$ENV_COMBINED; \
			echo "# Valores de .env.local (sobrescriben valores base)" >> $$ENV_COMBINED; \
			cat $$ENV_LOCAL >> $$ENV_COMBINED; \
		fi; \
		if [ -f "$$COMPOSE_ENV" ]; then \
			docker-compose -f docker-compose.yml -f $$COMPOSE_ENV --env-file $$ENV_COMBINED down; \
		else \
			docker-compose --env-file $$ENV_COMBINED down; \
		fi; \
	else \
		docker-compose down; \
	fi

docker-logs: ## Ver logs de Docker
	@ENV_BASE=$$(echo .env.$${NODE_ENV:-development}); \
	ENV_LOCAL=.env.local; \
	ENV_COMBINED=.env.docker; \
	COMPOSE_ENV=$$(echo docker-compose.$${NODE_ENV:-development}.yml); \
	if [ -f "$$ENV_BASE" ]; then \
		cat $$ENV_BASE > $$ENV_COMBINED; \
		if [ -f "$$ENV_LOCAL" ]; then \
			echo "" >> $$ENV_COMBINED; \
			echo "# Valores de .env.local (sobrescriben valores base)" >> $$ENV_COMBINED; \
			cat $$ENV_LOCAL >> $$ENV_COMBINED; \
		fi; \
		if [ -f "$$COMPOSE_ENV" ]; then \
			docker-compose -f docker-compose.yml -f $$COMPOSE_ENV --env-file $$ENV_COMBINED logs -f; \
		else \
			docker-compose --env-file $$ENV_COMBINED logs -f; \
		fi; \
	else \
		docker-compose logs -f; \
	fi

docker-clean-env: ## Limpiar archivo temporal .env.docker
	@rm -f .env.docker
	@echo "✅ Archivo .env.docker eliminado"

db-migrate: ## Ejecutar migraciones
	npm run migration:run

db-migrate-revert: ## Revertir última migración
	npm run migration:revert

lint: ## Ejecutar linter
	npm run lint

format: ## Formatear código con Prettier
	npm run format

test: ## Ejecutar tests
	npm run test

test-cov: ## Ejecutar tests con cobertura
	npm run test:cov

setup: install docker-up ## Configuración inicial completa
	@echo "✅ Configuración completada!"
	@echo "📝 No olvides crear el archivo .env.local basado en .env.example"
	@echo "🚀 Ejecuta 'make dev' para iniciar el servidor"

