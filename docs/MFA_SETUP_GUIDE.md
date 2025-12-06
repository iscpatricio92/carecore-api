# 🔐 Guía de Configuración MFA en Keycloak (TOTP)

Esta guía explica cómo configurar Multi-Factor Authentication (MFA) usando TOTP (Time-based One-Time Password) en Keycloak para el proyecto CareCore.

---

## 📋 Prerrequisitos

- Keycloak corriendo y accesible
- Acceso a la consola de administración de Keycloak
- Credenciales de administrador de Keycloak

**Acceso rápido:**
- Admin Console: `http://localhost:${KEYCLOAK_HTTP_PORT}` (ver `.env.local` para puerto)
- Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
- Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

---

## 🎯 Objetivo

Configurar MFA TOTP en Keycloak para que los usuarios puedan:
- Configurar MFA usando aplicaciones autenticadoras (Google Authenticator, Authy, etc.)
- Usar códigos TOTP de 6 dígitos para autenticación
- Tener MFA obligatorio para roles críticos (admin, practitioner)

---

## 📝 Pasos de Configuración

### Paso 1: Acceder a la Consola de Administración

1. Abre tu navegador y ve a: `http://localhost:${KEYCLOAK_HTTP_PORT}`
2. Haz clic en **"Administration Console"**
3. Inicia sesión con tus credenciales de administrador

### Paso 2: Navegar a Authentication Flows

1. En el menú lateral izquierdo, haz clic en **"Authentication"**
2. Haz clic en la pestaña **"Flows"**

### Paso 3: Crear o Copiar Flow de Autenticación con MFA

**Opción A: Crear un nuevo flow basado en Browser Flow (Recomendado)**

1. En la lista de flows, encuentra **"Browser"** (el flow por defecto)
2. Haz clic en el menú de tres puntos (⋮) junto a "Browser"
3. Selecciona **"Copy"**
4. Ingresa el nombre: **"Browser with MFA"**
5. Haz clic en **"Save"**

**Opción B: Modificar el flow Browser existente (No recomendado para producción)**

⚠️ **Nota:** Modificar el flow Browser por defecto puede afectar a todos los usuarios. Es mejor crear un flow separado.

### Paso 4: Configurar TOTP en el Flow

1. En la lista de flows, haz clic en **"Browser with MFA"** (o el flow que creaste)
2. Verás una lista de **"Authentication executions"** (ejecuciones de autenticación)

#### 4.1 Agregar OTP Form Step

1. Haz clic en el botón **"Add execution"** (o **"Add flow"**)
2. En el dropdown, selecciona **"OTP Form"**
3. Haz clic en **"Add"**
4. La ejecución "OTP Form" aparecerá en la lista

#### 4.2 Configurar OTP Form como Requerido

1. En la fila de **"OTP Form"**, haz clic en el menú de configuración (⚙️)
2. En **"Requirement"**, selecciona **"Required"** (o **"Conditional"** si quieres MFA opcional)
3. Haz clic en **"Save"**

#### 4.3 Ajustar Orden de Ejecución

1. Asegúrate de que el orden sea:
   - **Username Password Form** (requerido)
   - **OTP Form** (requerido o condicional)
2. Usa las flechas ↑↓ para reordenar si es necesario

### Paso 5: Configurar TOTP Settings

1. En el menú lateral, ve a **"Authentication"** > **"Required Actions"**
2. Busca **"Configure OTP"** en la lista
3. Asegúrate de que esté **"Enabled"** (habilitado)
4. Opcionalmente, puedes marcarlo como **"Default Action"** para forzar configuración en primer login

### Paso 6: Configurar TOTP Provider (Opcional - Ajustes Avanzados)

1. En el menú lateral, ve a **"Authentication"** > **"Providers"**
2. Busca **"OTP"** en la lista de providers
3. Haz clic en **"Config"** para ajustar:
   - **Algorithm:** SHA1 (recomendado)
   - **Digits:** 6 (recomendado)
   - **Period:** 30 (segundos, recomendado)
   - **Look Ahead Window:** 1 (recomendado)
   - **Initial Counter:** 0

**Configuración Recomendada:**
```
Algorithm: SHA1
Digits: 6
Period: 30 segundos
Look Ahead Window: 1
Initial Counter: 0
```

### Paso 7: Configurar MFA Condicional (Opcional - Para Roles Críticos)

Si quieres que MFA sea obligatorio solo para ciertos roles:

1. En el flow **"Browser with MFA"**, encuentra **"OTP Form"**
2. Haz clic en el menú de configuración (⚙️)
3. En **"Requirement"**, selecciona **"Conditional"**
4. Haz clic en **"Save"**
5. Haz clic en **"Add execution"** y selecciona **"Conditional OTP"**
6. Configura la condición:
   - **Condition:** "Required for roles"
   - **Roles:** `admin`, `practitioner`
7. Haz clic en **"Save"**

### Paso 8: Asignar Flow al Realm

1. En el menú lateral, ve a **"Realm Settings"**
2. Haz clic en la pestaña **"Login"**
3. En **"Browser Flow"**, selecciona **"Browser with MFA"** (o el flow que creaste)
4. Haz clic en **"Save"**

⚠️ **Nota:** Esto cambiará el flow de autenticación para todos los usuarios. Asegúrate de probar primero.

### Paso 9: Exportar Configuración del Realm (Recomendado)

1. En el menú lateral, ve a **"Realm Settings"**
2. Haz clic en la pestaña **"Export"**
3. Haz clic en **"Export"** para descargar la configuración del realm
4. Guarda el archivo JSON en `keycloak/realms/carecore-mfa.json` (o similar)

**Estructura recomendada:**
```
keycloak/
└── realms/
    ├── carecore.json          # Configuración base
    └── carecore-mfa.json      # Configuración con MFA
```

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

**Última actualización:** 2025-01-27
**Versión:** 1.0.0

