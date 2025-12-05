#!/bin/bash

# Script para asegurar que la base de datos de Keycloak existe
# Este script puede ejecutarse cuando el volumen de PostgreSQL ya existe
# pero la base de datos de Keycloak no ha sido creada aún
#
# Uso:
#   docker exec carecore-postgres /scripts/ensure-keycloak-db.sh
#   O desde docker-compose como parte del entrypoint
#
# Variables de entorno requeridas:
# - KEYCLOAK_DB_NAME: Nombre de la base de datos de Keycloak
# - POSTGRES_USER: Usuario de PostgreSQL
# - POSTGRES_DB: Base de datos inicial de PostgreSQL

set -e

# KEYCLOAK_DB_NAME debe estar definida en las variables de entorno
KEYCLOAK_DB_NAME="${KEYCLOAK_DB_NAME}"

if [ -z "$KEYCLOAK_DB_NAME" ]; then
  echo "❌ ERROR: KEYCLOAK_DB_NAME no está definida"
  exit 1
fi

# POSTGRES_USER y POSTGRES_DB deben estar disponibles
if [ -z "$POSTGRES_USER" ]; then
  echo "❌ ERROR: POSTGRES_USER no está definida"
  exit 1
fi

if [ -z "$POSTGRES_DB" ]; then
  echo "❌ ERROR: POSTGRES_DB no está definida"
  exit 1
fi

echo "🔍 Verificando si la base de datos '$KEYCLOAK_DB_NAME' existe..."

# Esperar a que PostgreSQL esté listo
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  echo "⏳ Esperando a que PostgreSQL esté listo..."
  sleep 1
done

# Verificar si la base de datos ya existe
# Usamos psql -lqt para listar las bases de datos y grep para buscar la nuestra
DB_EXISTS=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$KEYCLOAK_DB_NAME" && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "yes" ]; then
  echo "✅ La base de datos '$KEYCLOAK_DB_NAME' ya existe. No es necesario crearla."
  exit 0
fi

# La base de datos no existe, crearla
echo "🔧 La base de datos '$KEYCLOAK_DB_NAME' no existe. Creándola..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE $KEYCLOAK_DB_NAME;
    GRANT ALL PRIVILEGES ON DATABASE $KEYCLOAK_DB_NAME TO $POSTGRES_USER;
EOSQL

if [ $? -eq 0 ]; then
  echo "✅ Base de datos '$KEYCLOAK_DB_NAME' creada exitosamente"
else
  echo "❌ ERROR: No se pudo crear la base de datos '$KEYCLOAK_DB_NAME'"
  exit 1
fi

