# Exports de Realms de Keycloak

Esta carpeta contiene exports de realms de Keycloak para versionado y backup.

## ⚠️ Seguridad: ¿Es seguro commitear estos archivos?

### ✅ **SÍ es seguro commitear:**
- **Plantillas/base de configuración** (como `carecore-realm.json`)
  - Solo contiene configuración básica del realm
  - No incluye secrets, client secrets, ni información sensible
  - Es una plantilla para crear el realm desde cero

### ❌ **NO es seguro commitear:**
- **Exports completos** (archivos exportados directamente desde Keycloak)
  - Pueden contener información sensible
  - Pueden incluir configuraciones de usuarios
  - Pueden incluir client secrets (aunque normalmente no se exportan)
  - Pueden incluir otras configuraciones sensibles

## 📋 Convención de Nombres

Para diferenciar entre plantillas y exports:

- **Plantillas/base:** `*-realm.json` (ej: `carecore-realm.json`)
  - ✅ Seguro para commitear
  - Contiene solo configuración básica

- **Exports completos:** `*-realm-exported.json` o `*-realm-*.json` (ej: `carecore-realm-exported-2024-12-03.json`)
  - ❌ NO commitear
  - Contiene configuración completa exportada

## 🔒 Recomendaciones

1. **Para plantillas/base:**
   - ✅ Commitear el archivo base
   - ✅ Documentar qué configuración contiene
   - ✅ Usar como referencia para crear nuevos realms

2. **Para exports completos:**
   - ❌ NO commitear
   - ✅ Guardar localmente para backup
   - ✅ Usar para restaurar configuración si es necesario
   - ✅ Si necesitas compartir, revisar primero que no contenga información sensible

## 📝 Archivos en este directorio

- `carecore-realm.json` - Plantilla/base de configuración del realm (✅ seguro para commitear)
- `.gitkeep` - Mantener carpeta en git

## 🔄 Exportar Realm

Si necesitas exportar el realm completo:

```bash
# Exportar desde Keycloak
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh export \
  --realm carecore \
  --file /var/lib/keycloak/data/export/carecore-realm-exported.json

# Copiar desde el contenedor (NO commitear este archivo)
docker cp carecore-keycloak:/var/lib/keycloak/data/export/carecore-realm-exported.json \
  keycloak/realms/carecore-realm-exported-$(date +%Y-%m-%d).json
```

**⚠️ Importante:** Los archivos exportados NO deben commitearse al repositorio.

