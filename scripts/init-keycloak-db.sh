#!/bin/bash

# Script para inicializar la base de datos de Keycloak
# Este script se ejecuta automáticamente cuando PostgreSQL se inicializa por primera vez
# Se coloca en /docker-entrypoint-initdb.d/ y PostgreSQL lo ejecuta automáticamente
#
# También puede ejecutarse manualmente cuando el volumen ya existe pero la BD no:
# docker exec carecore-postgres /docker-entrypoint-initdb.d/99-init-keycloak-db.sh
#
# Variables de entorno requeridas (deben estar en .env.local o .env.development):
# - KEYCLOAK_DB_NAME: Nombre de la base de datos de Keycloak
# - POSTGRES_USER: Usuario de PostgreSQL (disponible automáticamente en el contenedor)
# - POSTGRES_DB: Base de datos inicial de PostgreSQL (disponible automáticamente en el contenedor)

set -e

# KEYCLOAK_DB_NAME debe estar definida en las variables de entorno
KEYCLOAK_DB_NAME="${KEYCLOAK_DB_NAME}"

if [ -z "$KEYCLOAK_DB_NAME" ]; then
  echo "❌ ERROR: KEYCLOAK_DB_NAME no está definida. Por favor, configúrala en tu archivo .env.local o .env.development"
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

echo "🔧 Inicializando base de datos de Keycloak..."

# Verificar si la base de datos ya existe
# Usamos psql -lqt para listar las bases de datos y grep para buscar la nuestra
DB_EXISTS=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$KEYCLOAK_DB_NAME" && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "yes" ]; then
  echo "ℹ️  La base de datos '$KEYCLOAK_DB_NAME' ya existe. No es necesario crearla."
  echo "✅ Inicialización completada (sin cambios)"
  exit 0
fi

# La base de datos no existe, crearla
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
  echo "❌ ERROR: No se pudo crear la base de datos '$KEYCLOAK_DB_NAME'"
  exit 1
fi

echo "✅ Inicialización completada"

