#!/bin/bash

# Script para inicializar la base de datos de Keycloak
# Este script se ejecuta automáticamente cuando PostgreSQL se inicializa por primera vez
# Se coloca en /docker-entrypoint-initdb.d/ y PostgreSQL lo ejecuta automáticamente
#
# Variables de entorno requeridas (deben estar en .env.local o .env.development):
# - KEYCLOAK_DB_NAME: Nombre de la base de datos de Keycloak

set -e

# KEYCLOAK_DB_NAME debe estar definida en las variables de entorno
KEYCLOAK_DB_NAME="${KEYCLOAK_DB_NAME}"

if [ -z "$KEYCLOAK_DB_NAME" ]; then
  echo "❌ ERROR: KEYCLOAK_DB_NAME no está definida. Por favor, configúrala en tu archivo .env.local o .env.development"
  exit 1
fi

echo "🔧 Inicializando base de datos de Keycloak..."

# Este script se ejecuta DESPUÉS de que PostgreSQL haya creado la base de datos inicial
# En el contexto de docker-entrypoint-initdb.d:
# - El script se ejecuta como el usuario que creó PostgreSQL (POSTGRES_USER)
# - Las variables POSTGRES_USER y POSTGRES_DB están disponibles
# - No necesitamos especificar usuario en psql porque ya estamos conectados como ese usuario

# Crear la base de datos de Keycloak
echo "🔧 Creando base de datos '$KEYCLOAK_DB_NAME'..."
# Conectarse a la base de datos inicial (POSTGRES_DB) usando el usuario POSTGRES_USER
# En el contexto de docker-entrypoint-initdb.d, debemos especificar explícitamente el usuario
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE $KEYCLOAK_DB_NAME;
    GRANT ALL PRIVILEGES ON DATABASE $KEYCLOAK_DB_NAME TO $POSTGRES_USER;
EOSQL

if [ $? -eq 0 ]; then
  echo "✅ Base de datos '$KEYCLOAK_DB_NAME' creada exitosamente"
else
  echo "⚠️  No se pudo crear la base de datos (puede que ya exista)"
fi

echo "✅ Inicialización completada"

