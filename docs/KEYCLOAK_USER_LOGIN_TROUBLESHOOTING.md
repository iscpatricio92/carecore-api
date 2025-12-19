# Solución: Error "Usuario o contraseña incorrectos" en Keycloak

Esta guía te ayuda a resolver el error **"Usuario o contraseña incorrectos"** cuando intentas hacer login desde la app móvil.

## 🎯 Problema

El error "Usuario o contraseña incorrectos" aparece cuando:

- ✅ El cliente está configurado correctamente (`carecore-mobile`)
- ✅ El redirect_uri está configurado (`carecore://auth`)
- ✅ PKCE está funcionando
- ❌ Las credenciales del usuario son incorrectas o el usuario no existe

## ✅ Verificar que el Usuario Existe en Keycloak

### Paso 1: Acceder a Keycloak Admin Console

1. Abre: `http://localhost:8080/admin`
2. Inicia sesión con tus credenciales de administrador
3. Selecciona el realm **`carecore`** (dropdown superior izquierdo)

### Paso 2: Buscar el Usuario

1. Ve a **Users** en el menú lateral
2. Busca el usuario por:
   - **Username** (el que usaste para registrarte)
   - **Email** (el email que usaste para registrarte)

3. Si el usuario **NO existe**, ve a la sección "Crear Usuario de Prueba" más abajo

4. Si el usuario **SÍ existe**, haz clic en él para ver sus detalles

### Paso 3: Verificar Estado del Usuario

Con el usuario abierto, verifica:

#### Pestaña "Details" (o "Settings")

- ✅ **Username:** Debe coincidir con el que usas para login
- ✅ **Email:** Debe coincidir con el que usas para login
- ✅ **Email Verified:** Puede estar en OFF (no afecta el login)
- ✅ **Enabled:** Debe estar en **ON** (si está en OFF, el usuario no puede hacer login)
- ✅ **Realm:** Debe ser **`carecore`**

#### Pestaña "Credentials"

1. Ve a la pestaña **Credentials**
2. Verifica que haya una contraseña configurada
3. Si no hay contraseña o quieres cambiarla:
   - Haz clic en **Set password** o **Reset password**
   - Ingresa la nueva contraseña
   - **IMPORTANTE:** Desactiva **Temporary** si NO quieres que el usuario tenga que cambiar la contraseña en el primer login
   - Haz clic en **Set** o **Save**

## 🔧 Soluciones Comunes

### Solución 1: El Usuario Está Deshabilitado

**Síntoma:** El usuario existe pero no puede hacer login.

**Solución:**

1. En la pestaña **Details** del usuario
2. Activa **Enabled** (debe estar en ON)
3. Haz clic en **Save**

### Solución 2: La Contraseña es Incorrecta

**Síntoma:** Estás seguro de que el usuario existe pero el login falla.

**Solución:**

1. Ve a la pestaña **Credentials** del usuario
2. Haz clic en **Reset password**
3. Ingresa una nueva contraseña
4. **Desactiva "Temporary"** (a menos que quieras que el usuario cambie la contraseña)
5. Haz clic en **Set**
6. Intenta hacer login con la nueva contraseña

### Solución 3: El Usuario No Existe

**Síntoma:** No encuentras el usuario en Keycloak.

**Causas posibles:**

- El registro falló silenciosamente
- El usuario se creó en otro realm
- El usuario se eliminó accidentalmente

**Solución:** Crea el usuario manualmente o intenta registrarte nuevamente.

## 👤 Crear Usuario de Prueba Manualmente

Si necesitas crear un usuario de prueba para probar el login:

### Paso 1: Crear el Usuario

1. En Keycloak Admin Console, ve a **Users**
2. Haz clic en **Create new user** o **Add user**
3. Completa:
   - **Username:** `test.patient` (o el que prefieras)
   - **Email:** `test.patient@example.com`
   - **First Name:** `Test`
   - **Last Name:** `Patient`
   - **Email Verified:** ON (opcional)
   - **Enabled:** **ON** (importante)
4. Haz clic en **Create**

### Paso 2: Establecer Contraseña

1. Con el usuario creado, ve a la pestaña **Credentials**
2. Haz clic en **Set password**
3. Ingresa una contraseña (ej: `TestPassword123!`)
4. **Desactiva "Temporary"** (para que no tenga que cambiar la contraseña)
5. Haz clic en **Set**

### Paso 3: Asignar Rol Patient

1. Ve a la pestaña **Role Mappings** o **Assigned roles**
2. Haz clic en **Assign role**
3. Selecciona **Filter by realm roles**
4. Busca y selecciona el rol **`patient`**
5. Haz clic en **Assign**
6. Verifica que el rol aparezca en la lista

### Paso 4: Probar Login

1. En la app móvil, intenta hacer login con:
   - **Username:** `test.patient`
   - **Password:** `TestPassword123!` (o la que configuraste)

## 🔍 Verificar Registro desde la App

Si te registraste desde la app móvil pero el usuario no aparece en Keycloak:

### Paso 1: Verificar Logs de la API

1. Revisa los logs del contenedor de la API:

   ```bash
   docker-compose logs api | grep -i "register\|create.*user\|error"
   ```

2. Busca errores relacionados con:
   - "Failed to create user"
   - "Permission denied"
   - "Invalid credentials"

### Paso 2: Verificar que el Registro Funcionó

1. Intenta registrarte nuevamente desde la app
2. Si recibes un error "Username already exists" o "Email already exists", significa que el usuario SÍ se creó
3. Busca el usuario en Keycloak con el username o email que usaste

### Paso 3: Verificar Permisos del Cliente Admin

Si el registro falla, verifica que el cliente `keycloak-admin-api` tenga permisos:

1. Ve a **Clients** → `keycloak-admin-api`
2. Ve a la pestaña **Service accounts roles**
3. Verifica que tenga asignado el rol **`manage-users`** en **realm-management**
4. Si no lo tiene, asígnalo (ver guía de configuración de permisos)

## 🧪 Probar Login con Usuario Existente

Si ya tienes un usuario en Keycloak y quieres probar el login:

### Opción 1: Usar el Usuario Admin (Solo para Pruebas)

⚠️ **NO recomendado para producción**, pero útil para pruebas:

1. Usa las credenciales de administrador:
   - **Username:** Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - **Password:** Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

2. Este usuario debería poder hacer login (aunque no tenga rol `patient`)

### Opción 2: Crear Usuario de Prueba

Sigue los pasos en "Crear Usuario de Prueba Manualmente" arriba.

## 📋 Checklist de Verificación

Usa este checklist para verificar que todo esté correcto:

- [ ] El usuario existe en Keycloak (realm `carecore`)
- [ ] El usuario está **Enabled** (ON)
- [ ] El usuario tiene una contraseña configurada
- [ ] La contraseña no es "Temporary" (o estás preparado para cambiarla en el primer login)
- [ ] El username y email coinciden con los que usas para login
- [ ] El usuario tiene el rol `patient` asignado (si es necesario)
- [ ] Estás usando el cliente correcto (`carecore-mobile`)
- [ ] El redirect_uri está configurado (`carecore://auth`)

## 🐛 Troubleshooting Avanzado

### Error: "User is disabled"

**Causa:** El usuario está deshabilitado en Keycloak.

**Solución:**

1. Ve a **Users** → selecciona el usuario
2. En **Details**, activa **Enabled**
3. Haz clic en **Save**

### Error: "Invalid user credentials"

**Causa:** La contraseña es incorrecta o el usuario no tiene contraseña.

**Solución:**

1. Ve a **Users** → selecciona el usuario
2. Ve a **Credentials**
3. Haz clic en **Reset password**
4. Establece una nueva contraseña
5. Desactiva "Temporary"
6. Haz clic en **Set**

### Error: "User not found"

**Causa:** El usuario no existe en el realm `carecore`.

**Solución:**

1. Verifica que estés en el realm correcto (`carecore`)
2. Busca el usuario en otros realms (si aplica)
3. Crea el usuario manualmente o intenta registrarte nuevamente

### El Usuario Existe pero No Puede Hacer Login

**Posibles causas:**

1. Usuario deshabilitado → Activa "Enabled"
2. Contraseña incorrecta → Resetea la contraseña
3. Usuario en otro realm → Verifica el realm
4. Cliente no tiene permisos → Verifica configuración del cliente

## 📚 Referencias

- [Keycloak User Management](https://www.keycloak.org/docs/latest/server_admin/#_user-management)
- [Keycloak User Credentials](https://www.keycloak.org/docs/latest/server_admin/#_user-credentials)
- [Configuración de Cliente Móvil](./VERIFY_MOBILE_CLIENT.md)
- [Guía de Registro de Pacientes](./docs/EMAIL_VERIFICATION.md)
