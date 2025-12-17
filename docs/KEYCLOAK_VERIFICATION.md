# ✅ Verificación de Criterios de Aceptación - Tarea #1: Keycloak Setup

Este documento describe cómo verificar que se cumplan todos los criterios de aceptación de la Tarea #1.

## 📋 Criterios de Aceptación

1. ✅ Keycloak inicia correctamente con `docker-compose up`
2. ✅ Keycloak accesible en http://localhost:8080
3. ✅ Admin console carga correctamente
4. ✅ Base de datos `keycloak_db` se crea automáticamente

---

## 🔧 Pre-requisitos

Antes de verificar, asegúrate de tener:

1. **Variables de entorno configuradas:**

   ```bash
   # Mínimo requerido en .env.development o .env.local
   DB_USER=
   DB_PASSWORD=
   DB_NAME=
   KEYCLOAK_ADMIN=
   KEYCLOAK_ADMIN_PASSWORD=
   KEYCLOAK_PORT=8080
   ```

   ⚠️ **IMPORTANTE:** Llena estos valores con tus credenciales reales en `.env.local` (este archivo NO se commitea).

2. **Docker y Docker Compose instalados:**
   ```bash
   docker --version
   docker-compose --version
   ```

---

## 🚀 Pasos de Verificación

### Paso 1: Iniciar los servicios

```bash
# Opción 1: Usando npm script
npm run docker:up

# Opción 2: Usando Makefile
make docker-up

# Opción 3: Directamente con docker-compose
docker-compose up -d
```

**Espera 1-2 minutos** para que Keycloak termine de iniciar completamente.

### Paso 2: Verificar que los contenedores estén corriendo

```bash
docker ps
```

Deberías ver:

- `carecore-postgres` - Estado: `Up` (healthy)
- `carecore-keycloak` - Estado: `Up` (healthy o starting)

### Paso 3: Verificar logs de Keycloak

```bash
# Ver logs en tiempo real
npm run docker:keycloak:logs

# O directamente
docker-compose logs -f keycloak
```

**Busca estos mensajes que indican que Keycloak está listo:**

```
Keycloak 25.0.4 on JVM
Listening on: http://0.0.0.0:8080
```

### Paso 4: Ejecutar script de verificación automática

```bash
./scripts/verify-keycloak-setup.sh
```

Este script verifica automáticamente todos los criterios de aceptación.

### Paso 5: Verificación manual

#### Criterio 1: Keycloak inicia correctamente

```bash
# Verificar que el contenedor está corriendo
docker ps --filter "name=carecore-keycloak" --filter "status=running"

# Verificar logs sin errores críticos
docker logs carecore-keycloak 2>&1 | grep -i error | head -5
```

**✅ Éxito si:** El contenedor está en estado `Up` y no hay errores críticos en los logs.

#### Criterio 2: Keycloak accesible en http://localhost:8080

```bash
# Verificar que el puerto está escuchando
curl -I http://localhost:8080

# O usando netcat
nc -z localhost 8080 && echo "Puerto 8080 está abierto"
```

**✅ Éxito si:** Recibes una respuesta HTTP (200, 302, o 401 son válidos).

#### Criterio 3: Admin console carga correctamente

```bash
# Verificar admin console
curl -I http://localhost:8080/admin

# O abrir en navegador
open http://localhost:8080/admin  # macOS
# xdg-open http://localhost:8080/admin  # Linux
```

**✅ Éxito si:**

- La página carga sin errores
- Puedes ver el formulario de login
- URL: http://localhost:8080/admin
- Credenciales: Usa los valores de `KEYCLOAK_ADMIN` y `KEYCLOAK_ADMIN_PASSWORD` de tu `.env.local`

#### Criterio 4: Base de datos keycloak_db se crea automáticamente

```bash
# Verificar que la base de datos existe
docker exec carecore-postgres psql -U ${DB_USER:-carecore} -lqt | grep keycloak_db

# O listar todas las bases de datos
docker exec carecore-postgres psql -U ${DB_USER:-carecore} -c "\l" | grep keycloak
```

**✅ Éxito si:** La base de datos `keycloak_db` aparece en la lista.

**Nota:** Keycloak crea la base de datos automáticamente en el primer inicio. Si no existe inmediatamente, espera 1-2 minutos y vuelve a verificar.

---

## 🐛 Troubleshooting

### Problema: Keycloak no inicia

**Síntomas:**

- Contenedor se reinicia constantemente
- Logs muestran errores de conexión a base de datos

**Solución:**

1. Verifica que PostgreSQL esté corriendo y saludable:

   ```bash
   docker ps | grep postgres
   docker logs carecore-postgres
   ```

2. Verifica las variables de entorno:

   ```bash
   docker exec carecore-keycloak env | grep -E "KEYCLOAK|KC_DB"
   ```

3. Verifica que el usuario de PostgreSQL tenga permisos:
   ```bash
   docker exec carecore-postgres psql -U ${DB_USER} -c "SELECT 1;"
   ```

### Problema: No puedo acceder a http://localhost:8080

**Síntomas:**

- `curl: (7) Failed to connect to localhost port 8080`
- Puerto no responde

**Solución:**

1. Verifica que el puerto esté mapeado correctamente:

   ```bash
   docker port carecore-keycloak
   ```

2. Verifica que no haya otro servicio usando el puerto 8080:

   ```bash
   lsof -i :8080  # macOS/Linux
   ```

3. Verifica los logs de Keycloak:
   ```bash
   npm run docker:keycloak:logs
   ```

### Problema: Base de datos keycloak_db no se crea

**Síntomas:**

- Base de datos no aparece después de varios minutos

**Solución:**

1. Verifica que Keycloak tenga permisos para crear bases de datos:
   - El usuario de PostgreSQL debe tener el rol `CREATEDB` o ser superusuario

2. Crea la base de datos manualmente (si es necesario):

   ```bash
   docker exec carecore-postgres psql -U ${DB_USER} -c "CREATE DATABASE keycloak_db;"
   ```

3. Reinicia Keycloak:
   ```bash
   docker-compose restart keycloak
   ```

### Problema: Admin console no carga

**Síntomas:**

- Página en blanco o error 404/500

**Solución:**

1. Espera más tiempo (Keycloak puede tardar 2-3 minutos en iniciar completamente)

2. Verifica los logs:

   ```bash
   npm run docker:keycloak:logs | grep -i error
   ```

3. Verifica que Keycloak esté completamente iniciado:
   ```bash
   curl http://localhost:8080/health/ready
   ```
   Debe devolver `200 OK` cuando esté listo.

---

## ✅ Checklist de Verificación

Usa este checklist para verificar manualmente:

- [ ] Contenedor `carecore-keycloak` está corriendo (`docker ps`)
- [ ] No hay errores críticos en los logs (`npm run docker:keycloak:logs`)
- [ ] Puerto 8080 está accesible (`curl http://localhost:8080`)
- [ ] Admin console carga correctamente (abrir http://localhost:8080/admin en navegador)
- [ ] Puedo hacer login con credenciales de admin
- [ ] Base de datos `keycloak_db` existe (`docker exec carecore-postgres psql -U ${DB_USER} -lqt | grep keycloak_db`)
- [ ] Healthcheck de Keycloak pasa (`docker inspect carecore-keycloak | grep -A 5 Health`)

---

## 📝 Notas Importantes

1. **Tiempo de inicio:** Keycloak puede tardar 1-3 minutos en iniciar completamente, especialmente en la primera ejecución.

2. **Base de datos automática:** Keycloak crea la base de datos `keycloak_db` automáticamente si no existe, pero el usuario de PostgreSQL debe tener permisos `CREATEDB`.

3. **Modo desarrollo:** Estamos usando `start-dev` que es más rápido pero menos seguro. Para producción, usar `start`.

4. **Persistencia:** Los datos de Keycloak se guardan en el volumen `keycloak_data`, por lo que se mantienen entre reinicios.

---

## 🎯 Resultado Esperado

Después de completar todos los pasos, deberías poder:

1. ✅ Ver Keycloak corriendo en http://localhost:8080
2. ✅ Acceder a la admin console en http://localhost:8080/admin
3. ✅ Hacer login con las credenciales configuradas
4. ✅ Ver la base de datos `keycloak_db` en PostgreSQL

**¡Todos los criterios de aceptación cumplidos!** 🎉
