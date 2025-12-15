# Seguridad de los Scripts de Inicialización

## ✅ Archivos Seguros para Commitear

Todos los scripts en este directorio son **seguros para commitear** porque:

1. **No contienen credenciales hardcodeadas**
   - Todas las credenciales se leen de variables de entorno
   - Las variables de entorno están en `.env.local` (que está en `.gitignore`)

2. **No tienen valores por defecto inseguros**
   - Los valores por defecto son solo para URLs y nombres (no sensibles)
   - Las credenciales (`KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`) son **requeridas** y el script falla si no están definidas

3. **Solo contienen lógica de configuración**
   - Descripciones de roles (públicas)
   - Configuración de clientes (sin secrets)
   - Lógica de creación/verificación

## 📋 Archivos en este Directorio

### Scripts (✅ Seguros para commitear)
- `setup-keycloak.sh` - Script maestro
- `create-roles.sh` - Crea roles base
- `create-api-client.sh` - Crea cliente API
- `create-web-client.sh` - Crea cliente Web
- `README.md` - Documentación

### Archivos de Configuración
- `carecore-realm.json` (en `../realms/`) - Plantilla base del realm (✅ Seguro, solo configuración)

## ⚠️ Archivos que NO deben Commitearse

Los siguientes archivos **NO deben commitearse** (están en `.gitignore`):

- `.env.local` - Contiene todas las credenciales
- `keycloak/realms/*-exported*.json` - Exports completos con datos sensibles
- `keycloak/realms/*-backup*.json` - Backups con datos sensibles
- `keycloak/backups/` - Directorio de backups

## 🔒 Variables de Entorno Requeridas

Los scripts requieren estas variables en `.env.local`:

```env
# Requeridas (sin valores por defecto)
KEYCLOAK_ADMIN=<tu-admin>
KEYCLOAK_ADMIN_PASSWORD=<tu-password>

# Opcionales (con valores por defecto seguros)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
```

## ✅ Verificación

Para verificar que no hay datos sensibles:

```bash
# Buscar credenciales hardcodeadas
grep -r "admin.*admin\|password.*password\|secret.*secret" keycloak/init/*.sh

# Verificar que .env.local está en .gitignore
git check-ignore .env.local
```

## 📝 Notas

- Los scripts son **idempotentes**: se pueden ejecutar múltiples veces sin problemas
- Los scripts **verifican** si los recursos ya existen antes de crearlos
- El Client Secret se **muestra** pero no se guarda en ningún archivo (solo en consola)
- Todos los datos sensibles se leen de `.env.local` que está en `.gitignore`

