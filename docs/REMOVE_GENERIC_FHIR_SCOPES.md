# Guía: Eliminar Scopes Genéricos de Keycloak

Esta guía explica cómo eliminar de forma segura los scopes genéricos `fhir:read` y `fhir:write` de Keycloak.

## ⚠️ Antes de Eliminar

### Paso 1: Verificar si están en uso

Antes de eliminar, verifica si estos scopes están asignados a algún cliente o rol:

1. **Acceder a Keycloak Admin Console:**
   - URL: `http://localhost:8080` (o tu `KEYCLOAK_URL`)
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`
   - Seleccionar realm "carecore"

2. **Verificar en Client Scopes:**
   - Ir a **Client scopes** en el menú lateral
   - Buscar `fhir:read` y `fhir:write`
   - Si existen, anotar sus nombres exactos

3. **Verificar asignaciones al cliente:**
   - Ir a **Clients** → **carecore-api**
   - Ir a la pestaña **Client scopes**
   - Verificar si `fhir:read` o `fhir:write` están en:
     - **Default Client Scopes** (se incluyen automáticamente)
     - **Optional Client Scopes** (se solicitan explícitamente)
   - Si están asignados, **removerlos primero** antes de eliminar los scopes

4. **Verificar tokens activos (opcional pero recomendado):**
   - Si hay usuarios con sesiones activas que tienen estos scopes, podrían experimentar errores
   - Considera esperar a que las sesiones expiren o forzar cierre de sesión

## 🗑️ Pasos para Eliminar

### Paso 2: Remover de Clientes

1. **Ir a Clients → carecore-api**
2. **Ir a la pestaña Client scopes**
3. **Si `fhir:read` está en Default Client Scopes:**
   - Encontrar `fhir:read` en la lista
   - Hacer clic en el botón **Remove** (o el ícono de eliminar)
   - Confirmar la eliminación
4. **Si `fhir:write` está en Default Client Scopes:**
   - Repetir el mismo proceso
5. **Si están en Optional Client Scopes:**
   - Removerlos de la misma manera

### Paso 3: Eliminar los Scopes

1. **Ir a Client scopes** en el menú lateral
2. **Buscar `fhir:read`:**
   - Hacer clic en el scope para abrirlo
   - Hacer clic en el botón **Delete** (generalmente en la parte superior derecha)
   - Confirmar la eliminación
3. **Buscar `fhir:write`:**
   - Repetir el mismo proceso

## ✅ Verificación Post-Eliminación

### Paso 4: Verificar que se eliminaron

1. **Verificar en Client scopes:**
   - Buscar `fhir:read` y `fhir:write`
   - No deberían aparecer en la lista

2. **Verificar en el cliente:**
   - Ir a **Clients → carecore-api → Client scopes**
   - Verificar que no aparezcan en ninguna lista

3. **Probar autenticación:**
   - Obtener un nuevo token de acceso
   - Decodificar el token JWT (usando [jwt.io](https://jwt.io))
   - Verificar que el campo `scope` **NO** contenga `fhir:read` ni `fhir:write`
   - Verificar que contenga los scopes correctos: `patient:read`, `encounter:read`, etc.

## 📝 Notas Importantes

- **Los scopes genéricos NO están implementados en el código**, así que eliminarlos es seguro
- **Los pacientes deben usar `patient:read`** para acceder a sus propios datos (incluyendo encounters)
- **Los practitioners deben usar `encounter:read`** para acceder a encounters
- Si algún usuario tiene problemas después de eliminar, verifica que tenga los scopes correctos asignados

## 🔄 Si Necesitas Revertir

Si por alguna razón necesitas recrear estos scopes (aunque no se recomienda):

1. Ir a **Client scopes** → **Create client scope**
2. Crear `fhir:read` con descripción "Read access to all FHIR resources"
3. Crear `fhir:write` con descripción "Write access to all FHIR resources"
4. Asignarlos al cliente si es necesario

**⚠️ ADVERTENCIA:** No se recomienda recrear estos scopes ya que violan el principio de menor privilegio.
