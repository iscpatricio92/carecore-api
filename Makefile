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
	echo "🔍 Verificando que la base de datos de Keycloak exista..."; \
	if docker exec carecore-postgres /usr/local/bin/ensure-keycloak-db.sh 2>/dev/null; then \
		echo "✅ Base de datos de Keycloak verificada/creada"; \
	else \
		echo "⚠️  No se pudo verificar/crear la base de datos de Keycloak (puede que el contenedor aún no esté listo)"; \
	fi; \
	echo "✅ PostgreSQL está corriendo en puerto 5432"; \
	echo "✅ Keycloak está corriendo en puerto 8080 (http://localhost:8080)"; \
	echo "✅ API está corriendo en puerto 3000 (http://localhost:3000)"; \
	echo ""; \
	echo "📋 Para ver los logs del API en tiempo real, ejecuta:"; \
	echo "   make docker-logs-api"

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
	elif [ -f "$$ENV_LOCAL" ]; then \
		cat $$ENV_LOCAL > $$ENV_COMBINED; \
		if [ -f "$$COMPOSE_ENV" ]; then \
			docker-compose -f docker-compose.yml -f $$COMPOSE_ENV --env-file $$ENV_COMBINED down; \
		else \
			docker-compose --env-file $$ENV_COMBINED down; \
		fi; \
	else \
		docker-compose down; \
	fi

docker-logs: ## Ver logs de Docker (todos los servicios)
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

docker-logs-api: ## Ver logs del API en tiempo real (recomendado para desarrollo)
	docker logs -f carecore-api

docker-logs-keycloak: ## Ver logs de Keycloak en tiempo real
	docker logs -f carecore-keycloak

docker-logs-postgres: ## Ver logs de PostgreSQL en tiempo real
	docker logs -f carecore-postgres

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

test: ## Ejecutar tests unitarios
	npm run test

test-cov: ## Ejecutar tests unitarios con cobertura
	npm run test:cov

test-e2e: ## Ejecutar tests E2E
	npm run test:e2e

test-e2e-cov: ## Ejecutar tests E2E con cobertura
	npm run test:e2e:cov

test-all: ## Ejecutar todos los tests (unitarios + E2E)
	npm run test:all

test-all-cov: ## Ejecutar todos los tests con cobertura
	npm run test:all:cov

setup: install docker-up ## Configuración inicial completa
	@echo "✅ Configuración completada!"
	@echo "📝 No olvides crear el archivo .env.local basado en .env.example"
	@echo "🚀 Ejecuta 'make dev' para iniciar el servidor"

