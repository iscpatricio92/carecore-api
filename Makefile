.PHONY: help install dev build start stop clean docker-up docker-down docker-logs docker-clean-env db-migrate lint format test

help: ## Mostrar esta ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias
	npm install

dev: ## Iniciar en modo desarrollo
	cd packages/api && npm run start:dev

build: ## Compilar el proyecto
	npm run build:shared && npm run build

start: ## Iniciar en modo producción
	cd packages/api && npm run start:prod

stop: ## Detener la aplicación
	@echo "Deteniendo aplicación..."

clean: docker-clean-env ## Limpiar archivos generados
	rm -rf dist node_modules coverage packages/*/dist packages/*/node_modules packages/*/coverage

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
	echo "🔧 Verificando configuración de Keycloak..."; \
	OUTPUT=$$(bash packages/api/scripts/init-keycloak-config.sh 2>&1); \
	if [ -z "$$OUTPUT" ]; then \
		echo "✅ Configuración de Keycloak verificada (todo está bien)"; \
	else \
		echo "$$OUTPUT"; \
	fi; \
	echo "✅ PostgreSQL está corriendo en puerto 5432"; \
	echo "✅ Keycloak está corriendo en puerto 8080 (http://localhost:8080)"; \
	echo "✅ API está corriendo en puerto 3000 (http://localhost:3000)"; \
	echo ""; \
	echo "📋 Para ver los logs del API en tiempo real, ejecuta:"; \
	echo "   make docker-logs-api"

docker-build: ## Reconstruir imágenes Docker
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
		echo "🔨 Reconstruyendo imágenes: docker-compose.yml + $$COMPOSE_ENV"; \
		docker-compose -f docker-compose.yml -f $$COMPOSE_ENV --env-file $$ENV_COMBINED build --no-cache; \
	else \
		echo "🔨 Reconstruyendo imágenes: docker-compose.yml (sin override)"; \
		docker-compose --env-file $$ENV_COMBINED build --no-cache; \
	fi; \
	echo "✅ Imágenes reconstruidas"

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
	cd packages/api && npm run migration:run

db-migrate-revert: ## Revertir última migración
	cd packages/api && npm run migration:revert

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

keycloak-setup: ## Configurar Keycloak (realm, roles, clientes)
	@echo "🔧 Configurando Keycloak..."
	@bash packages/api/keycloak/init/setup-keycloak.sh
	@echo ""
	@echo "✅ Configuración de Keycloak completada"
	@echo "📝 No olvides guardar el Client Secret de carecore-api en .env.local"
	@echo "💡 Ejecuta 'make keycloak-get-secret' para obtener el Client Secret automáticamente"

keycloak-get-secret: ## Obtener Client Secret de carecore-api
	@bash packages/api/keycloak/init/get-client-secret.sh

keycloak-backup: ## Hacer backup completo de Keycloak (realm + base de datos)
	@echo "💾 Iniciando backup de Keycloak..."
	@bash packages/api/scripts/backup-keycloak.sh

keycloak-backup-realm: ## Hacer backup solo del realm de Keycloak (incluye scopes)
	@bash packages/api/scripts/backup-keycloak-realm.sh

keycloak-create-scopes: ## Crear client scopes OAuth2 en Keycloak
	@if [ -z "$${KEYCLOAK_ADMIN}" ] || [ -z "$${KEYCLOAK_ADMIN_PASSWORD}" ]; then \
		echo "❌ Error: KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD deben estar configurados"; \
		echo "   Configúralos en .env.local antes de ejecutar este comando"; \
		exit 1; \
	fi
	@echo "🔐 Obteniendo token de administrador..."
	@TOKEN_RESPONSE=$$(curl -s -X POST "$${KEYCLOAK_URL:-http://localhost:8080}/realms/master/protocol/openid-connect/token" \
		-H "Content-Type: application/x-www-form-urlencoded" \
		-d "client_id=admin-cli" \
		-d "username=$${KEYCLOAK_ADMIN}" \
		-d "password=$${KEYCLOAK_ADMIN_PASSWORD}" \
		-d "grant_type=password"); \
	ACCESS_TOKEN=$$(echo "$$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4); \
	if [ -z "$$ACCESS_TOKEN" ] && command -v jq >/dev/null 2>&1; then \
		ACCESS_TOKEN=$$(echo "$$TOKEN_RESPONSE" | jq -r '.access_token // empty'); \
	fi; \
	if [ -z "$$ACCESS_TOKEN" ] || [ "$$ACCESS_TOKEN" = "null" ]; then \
		echo "❌ Error: No se pudo obtener token de administrador"; \
		echo "   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD en .env.local"; \
		exit 1; \
	fi; \
	bash packages/api/keycloak/init/create-scopes.sh "$$ACCESS_TOKEN"

keycloak-restore: ## Restaurar backup de Keycloak (requiere BACKUP_TIMESTAMP=YYYYMMDD-HHMMSS)
	@if [ -z "$(BACKUP_TIMESTAMP)" ]; then \
		echo "❌ Error: Se requiere BACKUP_TIMESTAMP"; \
		echo ""; \
		echo "Uso:"; \
		echo "  make keycloak-restore BACKUP_TIMESTAMP=20251205-143022"; \
		echo ""; \
		echo "Para ver backups disponibles:"; \
		echo "  ls -la packages/api/keycloak/backups/realms/"; \
		exit 1; \
	fi
	@bash packages/api/scripts/restore-keycloak.sh $(BACKUP_TIMESTAMP)

keycloak-verify-backup: ## Verificar que un backup de Keycloak es válido (requiere BACKUP_TIMESTAMP=YYYYMMDD-HHMMSS)
	@if [ -z "$(BACKUP_TIMESTAMP)" ]; then \
		echo "❌ Error: Se requiere BACKUP_TIMESTAMP"; \
		echo ""; \
		echo "Uso:"; \
		echo "  make keycloak-verify-backup BACKUP_TIMESTAMP=20251205-143022"; \
		echo ""; \
		echo "Para ver backups disponibles:"; \
		echo "  ls -la packages/api/keycloak/backups/realms/"; \
		exit 1; \
	fi
	@bash packages/api/scripts/verify-keycloak-backup.sh $(BACKUP_TIMESTAMP)

assign-practitioner-role: ## Asignar rol 'practitioner' a un usuario (requiere USERNAME=username)
	@if [ -z "$(USERNAME)" ]; then \
		echo "❌ Error: Se requiere USERNAME"; \
		echo ""; \
		echo "Uso:"; \
		echo "  make assign-practitioner-role USERNAME=dr.smith"; \
		echo ""; \
		echo "Ejemplo:"; \
		echo "  make assign-practitioner-role USERNAME=dr.smith"; \
		exit 1; \
	fi
	@bash packages/api/scripts/assign-practitioner-role.sh $(USERNAME)

