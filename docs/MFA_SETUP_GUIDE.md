# 🔐 Guía de Configuración MFA en Keycloak (TOTP)

Esta guía explica cómo configurar Multi-Factor Authentication (MFA) usando TOTP (Time-based One-Time Password) en Keycloak para el proyecto CareCore.

**Versión de Keycloak:** 25.0.4
**Última actualización:** 2025-12-06

---

## 📋 Prerrequisitos

- Keycloak 25.0.4 corriendo y accesible (configurado en Docker)
- Acceso a la consola de administración de Keycloak
- Credenciales de administrador de Keycloak

**Acceso rápido:**
- Admin Console: `http://localhost:${KEYCLOAK_HTTP_PORT:-8080}` (ver `.env.local` para puerto)
- Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
- Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

**Verificar versión:**
```bash
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh version
# Debería mostrar: Keycloak 25.0.4
```

---

## 🎯 Objetivo

Configurar MFA TOTP en Keycloak para que los usuarios puedan:
- Configurar MFA usando aplicaciones autenticadoras (Google Authenticator, Authy, etc.)
- Usar códigos TOTP de 6 dígitos para autenticación
- Tener MFA obligatorio para roles críticos (admin, practitioner)

---

## 📝 Pasos de Configuración

### Paso 1: Acceder a la Consola de Administración

1. Asegúrate de que Keycloak esté corriendo:
   ```bash
   docker ps | grep carecore-keycloak
   # O verifica con: make docker-up
   ```

2. Abre tu navegador y ve a: `http://localhost:${KEYCLOAK_HTTP_PORT:-8080}`
   - Por defecto: `http://localhost:8080`

3. Haz clic en **"Administration Console"** (o ve directamente a `/admin`)

4. Inicia sesión con tus credenciales de administrador:
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

5. Selecciona el realm **"carecore"** en el dropdown superior izquierdo (si no estás en él)

### Paso 2: Navegar a Authentication Flows

1. En el menú lateral izquierdo, haz clic en **"Authentication"**
2. Haz clic en la pestaña **"Flows"** (o **"Authentication flows"** en Keycloak 25.x)

**Nota para Keycloak 25.x:** La interfaz puede mostrar "Authentication flows" en lugar de solo "Flows"

### Paso 3: Crear o Copiar Flow de Autenticación con MFA

**Opción A: Crear un nuevo flow basado en Browser Flow (Recomendado)**

1. En la lista de flows, encuentra **"Browser"** (el flow por defecto)
2. Haz clic en el menú de tres puntos (⋮) o en el botón **"Actions"** junto a "Browser"
3. Selecciona **"Copy"** o **"Duplicate"**
4. Ingresa el nombre: **"Browser with MFA"**
5. Haz clic en **"Save"** o **"Create"**

**Nota para Keycloak 25.x:** El botón puede aparecer como un icono de tres puntos (⋮) o como un menú desplegable "Actions"

**Opción B: Modificar el flow Browser existente (No recomendado para producción)**

⚠️ **Nota:** Modificar el flow Browser por defecto puede afectar a todos los usuarios. Es mejor crear un flow separado.

### Paso 4: Configurar TOTP en el Flow

1. En la lista de flows, haz clic en **"Browser with MFA"** (o el flow que creaste)
2. Verás una lista de **"Authentication executions"** (ejecuciones de autenticación)

#### 4.1 Agregar OTP Form Step

1. En el flow "Browser with MFA", haz clic en el botón **"Add execution"** o **"Add step"**
2. En el dropdown o modal que aparece, selecciona **"OTP Form"** o busca "OTP" en la lista
3. Haz clic en **"Add"** o **"Select"**
4. La ejecución "OTP Form" aparecerá en la lista de ejecuciones del flow

**Nota para Keycloak 25.x:**
- El botón puede aparecer como **"Add step"** o **"Add execution"**
- Puede haber un modal con búsqueda para encontrar "OTP Form"

#### 4.2 Configurar OTP Form como Requerido

1. En la fila de **"OTP Form"**, haz clic en el icono de configuración (⚙️) o en el menú de acciones
2. En el modal o panel que aparece, busca **"Requirement"** o **"Requirement type"**
3. Selecciona **"Required"** (o **"Conditional"** si quieres MFA opcional)
4. Haz clic en **"Save"** o **"Update"**

**Nota para Keycloak 25.x:**
- El campo "Requirement" puede aparecer como un dropdown o como botones de radio
- Opciones disponibles: **Required**, **Conditional**, **Disabled**, **Alternative**

#### 4.3 Ajustar Orden de Ejecución

1. Asegúrate de que el orden sea:
   - **Username Password Form** (requerido)
   - **OTP Form** (requerido o condicional)
2. Usa las flechas ↑↓ para reordenar si es necesario

### Paso 5: Configurar TOTP Settings

1. En el menú lateral, ve a **"Authentication"** > **"Required Actions"** (o **"Required actions"**)
2. Busca **"Configure OTP"** o **"Configure TOTP"** en la lista de acciones requeridas
3. Asegúrate de que el toggle **"Enabled"** esté activado (ON)
4. Opcionalmente, puedes activar **"Default Action"** para forzar configuración en primer login
5. Haz clic en **"Save"** si es necesario

**Nota para Keycloak 25.x:**
- La interfaz usa toggles (interruptores) en lugar de checkboxes
- "Configure OTP" puede aparecer como "Configure TOTP" dependiendo de la versión

### Paso 6: Configurar TOTP Provider (Opcional - Ajustes Avanzados)

**Nota:** En Keycloak 25.x, la configuración de TOTP se hace principalmente a nivel de realm, no de provider.

1. En el menú lateral, ve a **"Realm Settings"** > **"Security Defenses"** > **"OTP Policy"**
   - O busca **"OTP Policy"** en Realm Settings
2. Configura los siguientes valores:
   - **OTP Hash Algorithm:** SHA1 (recomendado)
   - **OTP Digits:** 6 (recomendado)
   - **OTP Period:** 30 (segundos, recomendado)
   - **OTP Look Ahead Window:** 1 (recomendado)
   - **OTP Initial Counter:** 0
3. Haz clic en **"Save"**

**Configuración Recomendada:**
```
OTP Hash Algorithm: SHA1
OTP Digits: 6
OTP Period: 30 segundos
OTP Look Ahead Window: 1
OTP Initial Counter: 0
```

**Alternativa (si no encuentras OTP Policy):**
- La configuración también puede estar en **"Realm Settings"** > **"Login"** > **"OTP Policy"**

### Paso 7: Configurar MFA Condicional (Opcional - Para Roles Críticos)

Si quieres que MFA sea obligatorio solo para ciertos roles:

**⚠️ IMPORTANTE:** Los roles deben estar:
1. **Asignados a usuarios** (no a clientes) - Ve a Users > [usuario] > Role Mappings
2. **Incluidos en el token JWT** - Los clientes deben tener el scope "roles" (ya configurado)

1. En el flow **"Browser with MFA"**, encuentra **"OTP Form"**
2. Haz clic en el icono de configuración (⚙️)
3. En **"Requirement"**, selecciona **"Conditional"**
4. Haz clic en **"Save"**
5. Haz clic en **"Add execution"** o **"Add step"** y selecciona **"Conditional OTP"** o **"Conditional - OTP"**
6. Configura la condición:
   - Haz clic en el icono de configuración (⚙️) de "Conditional OTP"
   - En **"Condition"** o **"Condition type"**, selecciona **"Required for roles"** o **"Role-based"**
   - En **"Roles"**, deberías ver los realm roles (patient, practitioner, admin, etc.)
   - Selecciona los roles que requieren MFA: `admin`, `practitioner`
   - Puedes usar el botón **"Add role"** o buscar roles en el dropdown
7. Haz clic en **"Save"**

**Nota para Keycloak 25.x:**
- "Conditional OTP" puede aparecer como "Conditional - OTP" o "OTP - Conditional"
- La configuración de roles puede requerir buscar y seleccionar roles desde un dropdown
- Si no ves roles, verifica que:
  - Los roles estén asignados a usuarios (Users > [usuario] > Role Mappings)
  - El cliente tenga el scope "roles" en Client scopes (ya configurado en los scripts)

**Ver documentación completa:** Ver [KEYCLOAK_ROLES_AND_MFA.md](./KEYCLOAK_ROLES_AND_MFA.md) para más detalles

### Paso 8: Asignar Flow al Realm

1. En el menú lateral, ve a **"Realm Settings"**
2. Haz clic en la pestaña **"Login"** o **"User authentication"**
3. Busca la sección **"Flows"** o **"Authentication flows"**
4. En **"Browser Flow"** o **"Browser authentication flow"**, selecciona **"Browser with MFA"** (o el flow que creaste) del dropdown
5. Haz clic en **"Save"**

⚠️ **Nota:** Esto cambiará el flow de autenticación para todos los usuarios del realm. Asegúrate de probar primero con un usuario de prueba.

**Nota para Keycloak 25.x:**
- El campo puede aparecer como un dropdown con todos los flows disponibles
- Puede haber una sección separada para "Authentication flows" en lugar de estar en "Login"

### Paso 9: Exportar Configuración del Realm (Recomendado)

1. En el menú lateral, ve a **"Realm Settings"**
2. Haz clic en la pestaña **"Export"** o busca el botón **"Export"** en la parte superior
3. Haz clic en **"Export"** o **"Download"** para descargar la configuración del realm
4. El archivo JSON se descargará automáticamente
5. Guarda el archivo JSON en `keycloak/realms/carecore-mfa.json` (o similar)

**Alternativa usando script de backup:**
```bash
# Hacer backup completo (incluye realm + base de datos)
make keycloak-backup
```

**Estructura recomendada:**
```
keycloak/
└── realms/
    ├── carecore-realm.json    # Configuración base (ya existe)
    └── carecore-mfa.json      # Configuración con MFA (opcional)
```

**Nota para Keycloak 25.x:**
- El botón "Export" puede estar en la parte superior de la página de Realm Settings
- Puede haber opciones para exportar solo configuración o incluir usuarios

### Paso 10: Probar Configuración

1. Cierra sesión de la consola de administración
2. Inicia sesión con un usuario de prueba
3. Deberías ver una pantalla para configurar TOTP
4. Escanea el código QR con una app autenticadora (Google Authenticator, Authy, etc.)
5. Ingresa el código TOTP de 6 dígitos
6. Verifica que el login funcione correctamente

---

## 🔧 Configuración Avanzada

### Forzar MFA para Roles Específicos

Para hacer MFA obligatorio solo para ciertos roles:

1. Crea un **"Conditional OTP"** en el flow
2. Configura la condición para requerir MFA solo si el usuario tiene roles específicos
3. Alternativamente, puedes usar **"Required Actions"** para forzar configuración de MFA en primer login

### Múltiples Flows de Autenticación

Puedes crear múltiples flows:
- **Browser** - Sin MFA (para usuarios normales)
- **Browser with MFA** - Con MFA (para roles críticos)
- **Direct Grant** - Para APIs (sin MFA)

Y asignarlos según el tipo de cliente o usuario.

---

## 📚 Referencias

- [Keycloak Authentication Flows Documentation](https://www.keycloak.org/docs/latest/server_admin/#_authentication-flows)
- [Keycloak TOTP Documentation](https://www.keycloak.org/docs/latest/server_admin/#_otp)
- [Keycloak Required Actions](https://www.keycloak.org/docs/latest/server_admin/#_required_actions)

---

## ✅ Checklist de Verificación

- [ ] Flow "Browser with MFA" creado
- [ ] OTP Form agregado al flow
- [ ] OTP Form configurado como Required o Conditional
- [ ] TOTP Provider configurado (SHA1, 6 dígitos, 30 segundos)
- [ ] Configure OTP Required Action habilitado
- [ ] Flow asignado al realm (opcional, para testing)
- [ ] Configuración del realm exportada
- [ ] MFA probado con usuario de prueba
- [ ] Documentación actualizada

---

## 🚨 Troubleshooting

### Problema: No aparece la opción de configurar TOTP

**Solución:**
- Verifica que "Configure OTP" esté habilitado en Required Actions
- Verifica que el flow tenga OTP Form configurado
- Verifica que el usuario tenga permisos para configurar MFA

### Problema: Los códigos TOTP no funcionan

**Solución:**
- Verifica que el reloj del servidor esté sincronizado (NTP)
- Verifica la configuración del TOTP Provider (Period, Look Ahead Window)
- Asegúrate de que la app autenticadora esté sincronizada

### Problema: MFA no se requiere para roles críticos

**Solución:**
- Verifica que Conditional OTP esté configurado correctamente
- Verifica que los roles estén asignados correctamente al usuario
- Verifica que el flow esté asignado al realm o cliente correcto

---

**Última actualización:** 2025-12-06
**Versión:** 1.1.0
**Keycloak Version:** 25.0.4

