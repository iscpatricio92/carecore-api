# Keycloak Troubleshooting Guide

Esta guía cubre los problemas más comunes al trabajar con Keycloak en el proyecto CareCore.

## 📋 Tabla de Contenidos

- [Problemas de Inicio](#problemas-de-inicio)
- [Problemas de Conexión](#problemas-de-conexión)
- [Problemas de Acceso](#problemas-de-acceso)
- [Problemas de Base de Datos](#problemas-de-base-de-datos)
- [Problemas de Realm](#problemas-de-realm)
- [Problemas de Clientes](#problemas-de-clientes)
- [Problemas de Roles](#problemas-de-roles)
- [Comandos Útiles](#comandos-útiles)
- [Logs Importantes](#logs-importantes)

---

## 🚨 Problemas de Inicio

### Keycloak no inicia

**Síntomas:**

- El contenedor `carecore-keycloak` se detiene inmediatamente
- Error en logs: `Container exited (1)`
- Estado del contenedor: `Exited`

**Soluciones:**

1. **Verificar que PostgreSQL esté corriendo:**

   ```bash
   docker-compose ps postgres
   ```

   Si no está corriendo:

   ```bash
   docker-compose up -d postgres
   ```

2. **Verificar logs de Keycloak:**

   ```bash
   docker-compose logs keycloak | tail -100
   ```

3. **Verificar variables de entorno:**

   ```bash
   # Verificar que las variables estén definidas
   grep KEYCLOAK .env.local
   ```

4. **Verificar que la base de datos exista:**

   ```bash
   docker exec carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "\l" | grep "${KEYCLOAK_DB_NAME}"
   ```

5. **Reiniciar contenedores:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Keycloak tarda mucho en iniciar

**Síntomas:**

- El contenedor está en estado `Starting` por más de 5 minutos
- Logs muestran mensajes repetitivos

**Soluciones:**

1. **Verificar recursos del sistema:**

   ```bash
   docker stats carecore-keycloak
   ```

   Keycloak requiere al menos 512MB de RAM.

2. **Verificar logs para errores:**

   ```bash
   docker-compose logs -f keycloak
   ```

3. **Aumentar timeout de healthcheck (si es necesario):**
   Editar `docker-compose.yml` y aumentar `timeout` en el healthcheck.

---

## 🔌 Problemas de Conexión

### Error: "FATAL: database does not exist"

**Síntomas:**

- Logs muestran: `FATAL: database "keycloak_db" does not exist`
- Keycloak no puede conectarse a la base de datos

**Soluciones:**

1. **Verificar que el script de inicialización se ejecutó:**

   ```bash
   docker exec carecore-postgres ls -la /docker-entrypoint-initdb.d/ | grep keycloak
   ```

2. **Crear la base de datos manualmente:**

   ```bash
   docker exec carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "CREATE DATABASE ${KEYCLOAK_DB_NAME};"
   ```

3. **Verificar que el script tenga permisos de ejecución:**

   ```bash
   ls -la scripts/init-keycloak-db.sh
   ```

4. **Reiniciar PostgreSQL para ejecutar scripts de inicialización:**
   ```bash
   docker-compose down -v  # ⚠️ Esto elimina los volúmenes
   docker-compose up -d postgres
   # Esperar a que PostgreSQL termine de inicializar
   docker-compose up -d keycloak
   ```

### Error: "Connection refused" o "ECONNREFUSED"

**Síntomas:**

- Keycloak no puede conectarse a PostgreSQL
- Logs muestran errores de conexión

**Soluciones:**

1. **Verificar que PostgreSQL esté accesible:**

   ```bash
   docker exec carecore-postgres pg_isready -U "${DB_USER}"
   ```

2. **Verificar variables de conexión:**

   ```bash
   # Verificar que KEYCLOAK_DB_HOST apunte al servicio correcto
   grep KEYCLOAK_DB_HOST .env.local
   # Debe ser "postgres" (nombre del servicio en Docker)
   ```

3. **Verificar red de Docker:**

   ```bash
   docker network inspect carecore-api_carecore-network | grep -A 5 postgres
   ```

4. **Verificar que los servicios estén en la misma red:**
   ```bash
   docker-compose ps
   # Todos deben estar en la misma red
   ```

### Error: "The server does not support SSL connections"

**Síntomas:**

- Keycloak intenta usar SSL pero PostgreSQL no lo tiene habilitado

**Soluciones:**

1. **Verificar configuración de SSL en variables de entorno:**

   ```bash
   grep KEYCLOAK_DB .env.local
   # En desarrollo, SSL debe estar deshabilitado
   ```

2. **Verificar configuración en docker-compose.yml:**
   - Asegurarse de que no haya variables de SSL configuradas para desarrollo

---

## 🔐 Problemas de Acceso

### No puedo acceder a Admin Console

**Síntomas:**

- No se puede acceder a `http://localhost:${KEYCLOAK_HTTP_PORT}`
- Página no carga o muestra error

**Soluciones:**

1. **Verificar que Keycloak esté corriendo:**

   ```bash
   docker-compose ps keycloak
   # Debe estar en estado "Up (healthy)"
   ```

2. **Verificar que el puerto esté disponible:**

   ```bash
   curl http://localhost:${KEYCLOAK_HTTP_PORT}
   # Debe responder con HTML
   ```

3. **Verificar que el puerto no esté en uso:**

   ```bash
   lsof -i :${KEYCLOAK_HTTP_PORT}
   # O en Windows: netstat -ano | findstr :${KEYCLOAK_HTTP_PORT}
   ```

4. **Verificar variables de entorno:**

   ```bash
   grep KEYCLOAK_HTTP_PORT .env.local
   ```

5. **Verificar logs para errores:**
   ```bash
   docker-compose logs keycloak | grep -i error
   ```

### Credenciales incorrectas

**Síntomas:**

- No se puede iniciar sesión en Admin Console
- Error: "Invalid username or password"

**Soluciones:**

1. **Verificar credenciales en `.env.local`:**

   ```bash
   grep KEYCLOAK_ADMIN .env.local
   grep KEYCLOAK_ADMIN_PASSWORD .env.local
   ```

2. **Verificar que las variables estén definidas:**

   ```bash
   # Las variables no deben estar vacías
   [ -z "$KEYCLOAK_ADMIN" ] && echo "KEYCLOAK_ADMIN está vacío"
   [ -z "$KEYCLOAK_ADMIN_PASSWORD" ] && echo "KEYCLOAK_ADMIN_PASSWORD está vacío"
   ```

3. **Reiniciar Keycloak si cambiaste las credenciales:**

   ```bash
   docker-compose restart keycloak
   ```

4. **Acceder al realm "master" directamente:**
   - URL: `http://localhost:${KEYCLOAK_HTTP_PORT}/admin/master/console/`
   - Usar credenciales del realm "master"

---

## 💾 Problemas de Base de Datos

### Base de datos no se crea automáticamente

**Síntomas:**

- El script `init-keycloak-db.sh` no se ejecuta
- La base de datos `keycloak_db` no existe

**Soluciones:**

1. **Verificar que el script esté montado:**

   ```bash
   docker exec carecore-postgres ls -la /docker-entrypoint-initdb.d/ | grep keycloak
   ```

2. **Verificar logs de PostgreSQL:**

   ```bash
   docker-compose logs postgres | grep -i keycloak
   ```

3. **Verificar que el script sea válido:**

   ```bash
   bash -n scripts/init-keycloak-db.sh
   # No debe mostrar errores
   ```

4. **Crear la base de datos manualmente:**

   ```bash
   docker exec carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "CREATE DATABASE ${KEYCLOAK_DB_NAME};"
   ```

5. **Verificar permisos del usuario:**
   ```bash
   docker exec carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "\du"
   # El usuario debe tener permisos CREATEDB
   ```

### Error al conectar a la base de datos

**Síntomas:**

- Keycloak no puede conectarse a la base de datos
- Logs muestran errores de autenticación

**Soluciones:**

1. **Verificar credenciales de base de datos:**

   ```bash
   grep KEYCLOAK_DB .env.local
   # Verificar KEYCLOAK_DB_USER, KEYCLOAK_DB_PASSWORD, etc.
   ```

2. **Probar conexión manualmente:**

   ```bash
   docker exec carecore-postgres psql -U "${KEYCLOAK_DB_USER}" -d "${KEYCLOAK_DB_NAME}" -c "SELECT 1;"
   ```

3. **Verificar que el usuario tenga permisos:**
   ```bash
   docker exec carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "GRANT ALL PRIVILEGES ON DATABASE ${KEYCLOAK_DB_NAME} TO ${KEYCLOAK_DB_USER};"
   ```

---

## 🏛️ Problemas de Realm

### No puedo crear el realm

**Síntomas:**

- Error al crear el realm "carecore"
- El realm no aparece en la lista

**Soluciones:**

1. **Verificar que estés en el realm "master":**
   - En Admin Console, verificar el dropdown superior izquierdo
   - Debe decir "master"

2. **Verificar permisos de administrador:**
   - Asegurarse de estar logueado como administrador
   - Verificar que las credenciales sean correctas

3. **Verificar logs para errores:**

   ```bash
   docker-compose logs keycloak | grep -i realm
   ```

4. **Intentar importar desde JSON:**
   - Ver [REALM_SETUP.md](./REALM_SETUP.md) para instrucciones

### El realm no se importa correctamente

**Síntomas:**

- Error al importar `carecore-realm.json`
- El realm se crea pero falta configuración

**Soluciones:**

1. **Verificar que el JSON sea válido:**

   ```bash
   cat keycloak/realms/carecore-realm.json | jq .
   # No debe mostrar errores
   ```

2. **Verificar que el archivo no tenga datos sensibles:**
   - El archivo base no debe contener secrets
   - Verificar que sea el archivo correcto

3. **Crear el realm manualmente:**
   - Ver [REALM_SETUP.md](./REALM_SETUP.md) para instrucciones paso a paso

---

## 🔑 Problemas de Clientes

### No puedo obtener token del cliente API

**Síntomas:**

- Error al hacer petición de token
- Error: "Invalid client credentials"

**Soluciones:**

1. **Verificar Client Secret:**

   ```bash
   grep KEYCLOAK_CLIENT_SECRET .env.local
   # Debe tener un valor (no vacío)
   ```

2. **Verificar que el cliente esté configurado:**
   - En Admin Console, ir a Clients → `carecore-api`
   - Verificar que el Client ID sea correcto
   - Verificar que el Access Type sea "confidential"

3. **Regenerar Client Secret si es necesario:**
   - En Admin Console, ir a Clients → `carecore-api` → Credentials
   - Hacer clic en "Regenerate secret"
   - Actualizar `.env.local` con el nuevo secret

4. **Verificar que el cliente esté habilitado:**
   - En Admin Console, verificar que "Enabled" esté en ON

### Cliente web no funciona con PKCE

**Síntomas:**

- Error al autenticar con el cliente web
- Error: "Invalid code verifier"

**Soluciones:**

1. **Verificar que PKCE esté habilitado:**
   - En Admin Console, ir a Clients → `carecore-web`
   - Verificar que "Standard Flow" esté habilitado
   - Verificar que "PKCE Code Challenge Method" esté configurado (S256)

2. **Verificar Redirect URIs:**
   - Verificar que las URIs estén configuradas correctamente
   - Ver [CLIENT_WEB_SETUP.md](./CLIENT_WEB_SETUP.md)

3. **Usar el script de verificación:**
   ```bash
   ./scripts/verify-web-client.sh
   ```

---

## 👥 Problemas de Roles

### Los roles no aparecen en el token

**Síntomas:**

- El token JWT no incluye los roles
- El campo `realm_access.roles` está vacío

**Soluciones:**

1. **Verificar que los roles estén asignados al usuario:**
   - En Admin Console, ir a Users → [usuario] → Role mappings
   - Verificar que los roles estén asignados

2. **Verificar configuración de mappers:**
   - En Admin Console, ir a Clients → `carecore-api` → Mappers
   - Verificar que exista un mapper para roles
   - Ver [CLIENT_API_SETUP.md](./CLIENT_API_SETUP.md)

3. **Verificar scope en la petición:**
   - La petición de token debe incluir el scope `roles`

4. **Verificar que el cliente tenga acceso a roles:**
   - En Admin Console, ir a Clients → `carecore-api` → Service account roles
   - Asignar roles si es necesario

---

## 🛠️ Comandos Útiles

### Ver estado de servicios

```bash
# Ver estado de todos los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f keycloak

# Ver logs de los últimos 100 líneas
docker-compose logs --tail=100 keycloak
```

### Reiniciar servicios

```bash
# Reiniciar solo Keycloak
docker-compose restart keycloak

# Reiniciar todos los servicios
docker-compose restart

# Detener y volver a iniciar
docker-compose down
docker-compose up -d
```

### Acceder a contenedores

```bash
# Acceder al contenedor de Keycloak
docker exec -it carecore-keycloak /bin/bash

# Acceder al contenedor de PostgreSQL
docker exec -it carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}"
```

### Verificar conectividad

```bash
# Verificar que Keycloak responda
curl http://localhost:${KEYCLOAK_HTTP_PORT}

# Verificar healthcheck
curl http://localhost:${KEYCLOAK_HTTP_PORT}/health/ready

# Verificar que PostgreSQL responda
docker exec carecore-postgres pg_isready -U "${DB_USER}"
```

---

## 📊 Logs Importantes

### Dónde encontrar logs

1. **Logs de Keycloak:**

   ```bash
   docker-compose logs keycloak
   ```

2. **Logs de PostgreSQL:**

   ```bash
   docker-compose logs postgres
   ```

3. **Logs combinados:**
   ```bash
   docker-compose logs
   ```

### Qué buscar en los logs

1. **Errores de conexión:**
   - Buscar: `FATAL`, `ERROR`, `Connection refused`
   - Indicadores: Problemas de red o base de datos

2. **Errores de autenticación:**
   - Buscar: `Invalid credentials`, `Authentication failed`
   - Indicadores: Credenciales incorrectas

3. **Errores de inicialización:**
   - Buscar: `Failed to start`, `Initialization error`
   - Indicadores: Configuración incorrecta

4. **Warnings importantes:**
   - Buscar: `WARN`, `WARNING`
   - Pueden indicar problemas de configuración

---

## 🔍 Diagnóstico Rápido

Si nada funciona, ejecuta este script de diagnóstico:

```bash
#!/bin/bash
echo "=== Diagnóstico de Keycloak ==="
echo ""
echo "1. Estado de servicios:"
docker-compose ps
echo ""
echo "2. Variables de entorno:"
grep KEYCLOAK .env.local | grep -v PASSWORD
echo ""
echo "3. Base de datos:"
docker exec carecore-postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "\l" | grep "${KEYCLOAK_DB_NAME}"
echo ""
echo "4. Conectividad:"
curl -s http://localhost:${KEYCLOAK_HTTP_PORT} > /dev/null && echo "✅ Keycloak responde" || echo "❌ Keycloak no responde"
echo ""
echo "5. Logs recientes:"
docker-compose logs --tail=20 keycloak
```

---

## 📚 Referencias

- [REALM_SETUP.md](./REALM_SETUP.md) - Configuración del realm
- [CLIENT_API_SETUP.md](./CLIENT_API_SETUP.md) - Configuración del cliente API
- [CLIENT_WEB_SETUP.md](./CLIENT_WEB_SETUP.md) - Configuración del cliente web
- [ROLES_SETUP.md](./ROLES_SETUP.md) - Configuración de roles
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Troubleshooting](https://www.keycloak.org/docs/latest/server_admin/#troubleshooting)

---

## 💡 Consejos

1. **Siempre verifica los logs primero** - La mayoría de los problemas tienen mensajes de error claros
2. **Verifica las variables de entorno** - Muchos problemas son por valores incorrectos
3. **Reinicia los servicios** - A veces un simple reinicio resuelve problemas temporales
4. **Usa los scripts de verificación** - Los scripts automatizados pueden detectar problemas comunes
5. **Mantén backups** - Siempre haz backup antes de hacer cambios importantes
