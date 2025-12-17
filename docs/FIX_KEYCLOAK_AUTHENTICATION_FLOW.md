# Solución: Error en Flujo de Autenticación de Keycloak

Esta guía explica cómo corregir el error del flujo de autenticación que impide que aparezca el formulario de login.

## 🎯 Problema

El error en los logs muestra dos problemas:

1. **Warning:** `REQUIRED and ALTERNATIVE elements at same level!`
   - Hay elementos REQUIRED y ALTERNATIVE al mismo nivel, lo cual no está permitido

2. **Error:** `authenticator 'auth-conditional-otp-form' requires user to be set in the authentication context by previous authenticators, but user is not set yet`
   - El authenticator de OTP condicional está intentando ejecutarse **antes** de que el usuario se autentique

**Causa:** El flujo de autenticación **Browser** del realm está mal configurado. El authenticator `auth-conditional-otp-form` está en el nivel incorrecto o está configurado como REQUIRED cuando debería ser CONDITIONAL y estar después del formulario de usuario/contraseña.

## ✅ Solución: Corregir el Flujo de Autenticación

### Paso 0: Verificar que el Flujo Browser Está Asignado

**⚠️ IMPORTANTE:** Si el flujo **Browser** aparece como "not in use", primero debes asignarlo:

1. En **Authentication**, ve a la pestaña **Bindings**
2. En **Browser Flow**, selecciona **`browser`** del dropdown
3. Haz clic en **Save**

**📖 Ver guía completa:** [ASSIGN_BROWSER_FLOW.md](./ASSIGN_BROWSER_FLOW.md)

### Paso 1: Acceder a Keycloak Admin Console

1. Abre: `http://localhost:8080/admin`
2. Inicia sesión con tus credenciales de administrador
3. Selecciona el realm **`carecore`**

### Paso 2: Verificar Flujo de Autenticación

1. En el menú lateral, ve a **Authentication**
2. Verás una lista de flujos de autenticación:
   - **Browser** (para login web/móvil)
   - **Direct Grant** (para API)
   - **Registration** (para registro)
   - etc.

3. Haz clic en **Browser** (este es el flujo que usa OAuth2)

### Paso 3: Verificar Configuración del Flujo Browser

En el flujo **Browser**, deberías ver algo como esto:

```
Browser Flow
├── Cookie (ALTERNATIVE)
├── Identity Provider Redirector (ALTERNATIVE)
└── Forms (REQUIRED)
    ├── Username Password Form (REQUIRED)
    └── OTP Form (CONDITIONAL) ← Debe estar después y ser CONDITIONAL
```

**El problema:** Si `Conditional OTP Form` está:

- En el mismo nivel que `Cookie` o `Identity Provider Redirector` (nivel superior)
- Antes de `Username Password Form`
- Configurado como REQUIRED en lugar de CONDITIONAL

Causará el error porque intenta ejecutarse antes de que el usuario se autentique.

### Paso 4: Corregir el Flujo

#### Opción A: Eliminar o Mover Conditional OTP (Recomendado para Desarrollo)

1. En el flujo **Browser**, busca **Conditional OTP** o **OTP Form**
2. **Si está al nivel superior** (mismo nivel que Cookie):
   - Haz clic en el menú (⋮) junto a **Conditional OTP**
   - Selecciona **Delete** (eliminar completamente)
   - O arrástralo dentro de **Forms** para que esté después de **Username Password Form**

3. **Si está dentro de Forms pero antes de Username Password Form**:
   - Arrástralo para que esté **después** de **Username Password Form**
   - O elimínalo si no necesitas MFA por ahora

4. **Verifica que sea CONDITIONAL** (no REQUIRED):
   - Haz clic en el menú (⋮) junto a **Conditional OTP**
   - Selecciona **Config**
   - Verifica que **Requirement** sea **CONDITIONAL** (no REQUIRED)
   - **Save**

#### Opción B: Reconfigurar el Flujo Correctamente

1. En el flujo **Browser**, verifica que la estructura sea:

```
Browser Flow
├── Cookie (ALTERNATIVE)
├── Identity Provider Redirector (ALTERNATIVE)
└── Forms (REQUIRED)
    ├── Username Password Form (REQUIRED) ← Debe ser primero
    └── OTP Form (CONDITIONAL) ← Debe estar después y ser CONDITIONAL
```

2. Si **OTP Form** está en el nivel incorrecto:
   - Haz clic en el menú (⋮) junto a **OTP Form**
   - Selecciona **Delete**
   - O arrástralo para que esté después de **Username Password Form**

### Paso 5: Corregir Elementos REQUIRED y ALTERNATIVE al Mismo Nivel

El warning dice:

```
REQUIRED and ALTERNATIVE elements at same level! Those alternative executions will be ignored
```

**Problema:** Si hay un elemento **REQUIRED** (como `Conditional OTP`) al mismo nivel que elementos **ALTERNATIVE** (como `Cookie`), Keycloak ignorará los alternativos.

**Solución:**

1. En el flujo **Browser**, verifica la estructura al nivel superior:
   - ✅ Debe haber solo elementos **ALTERNATIVE** al nivel superior
   - ✅ Solo debe haber **UN** elemento **REQUIRED** al nivel superior (normalmente `Forms`)

2. **Si `Conditional OTP` está al nivel superior:**
   - **Elimínalo** del nivel superior
   - O **muévelo** dentro de `Forms` (después de `Username Password Form`)

3. La estructura correcta debería ser:
   ```
   Browser Flow
   ├── Cookie (ALTERNATIVE) ← Nivel superior: solo ALTERNATIVE
   ├── Identity Provider Redirector (ALTERNATIVE) ← Nivel superior: solo ALTERNATIVE
   └── Forms (REQUIRED) ← Único REQUIRED al nivel superior
       ├── Username Password Form (REQUIRED)
       └── Conditional OTP (CONDITIONAL) ← Debe estar aquí, no al nivel superior
   ```

### Paso 6: Restablecer Flujo a Default (Si es Necesario)

Si el flujo está muy desconfigurado, puedes restablecerlo:

#### Opción A: Copiar Flujo Default

1. En **Authentication** → **Flows**
2. Haz clic en el menú (⋮) junto a **browser** (el flujo default)
3. Selecciona **Copy**
4. **Alias:** `browser-copy` (o el nombre que prefieras)
5. **Create**

Luego:

1. Ve a **Realm settings** → **Authentication** → **Bindings**
2. En **Browser Flow**, selecciona tu nuevo flujo (`browser-copy`)
3. **Save**

#### Opción B: Crear Flujo desde Cero

1. **Authentication** → **Flows** → **Create flow**
2. **Alias:** `browser-mobile` (o el nombre que prefieras)
3. **Type:** `basic-flow`
4. **Description:** `Browser flow for mobile app`
5. **Create**

Luego agrega los ejecutores en este orden:

**Paso 1: Agregar Cookie (ALTERNATIVE)**

1. Haz clic en **Add execution**
2. Selecciona **Cookie** → **Add**
3. Configura **Requirement** como **ALTERNATIVE**
4. **Save**

**Paso 2: Agregar Identity Provider Redirector (ALTERNATIVE)**

1. Haz clic en **Add execution**
2. Selecciona **Identity Provider Redirector** → **Add**
3. Configura **Requirement** como **ALTERNATIVE**
4. **Save**

**Paso 3: Agregar Forms (REQUIRED)**

1. Haz clic en **Add execution**
2. Selecciona **Forms** → **Add**
3. Configura **Requirement** como **REQUIRED**
4. **Save**

**Paso 4: Agregar Username Password Form (dentro de Forms)**

1. Expande **Forms** (haz clic en la flecha)
2. Haz clic en **Add execution** (dentro de Forms)
3. Selecciona **Username Password Form** → **Add**
4. Configura **Requirement** como **REQUIRED**
5. **Save**

**Paso 5: Agregar Conditional OTP (opcional, dentro de Forms)**

1. Dentro de **Forms**, haz clic en **Add execution**
2. Selecciona **Conditional OTP** → **Add**
3. Configura **Requirement** como **CONDITIONAL** (no REQUIRED)
4. **Save**

**Paso 6: Asignar el Flujo**

1. Ve a **Realm settings** → **Authentication** → **Bindings**
2. En **Browser Flow**, selecciona tu nuevo flujo (`browser-mobile`)
3. **Save**

### Paso 7: Asignar el Flujo al Cliente (Si es Necesario)

Si creaste un nuevo flujo:

1. Ve a **Clients** → `carecore-mobile`
2. Ve a la pestaña **Advanced settings**
3. En **Authentication flow overrides**, selecciona:
   - **Browser Flow:** El flujo que configuraste (o deja en default)
4. **Save**

## 🧪 Probar la Solución

1. Reinicia el contenedor de Keycloak (opcional, pero recomendado):

   ```bash
   docker-compose restart keycloak
   ```

2. Espera a que Keycloak esté listo (30-60 segundos)

3. En la app móvil, intenta hacer login nuevamente

4. Keycloak debería mostrar el formulario de login correctamente

## 🐛 Troubleshooting

### El Error Persiste Después de Corregir el Flujo

**Causa:** Puede haber un problema con la configuración del realm o del cliente.

**Solución:**

1. Verifica que el flujo **Browser** esté correctamente configurado
2. Verifica que no haya otros flujos personalizados que estén causando conflicto
3. Intenta usar el flujo **Browser** por defecto de Keycloak

### No Puedo Ver el Flujo de Autenticación

**Causa:** Puede que no tengas permisos o el realm esté mal configurado.

**Solución:**

1. Verifica que estés en el realm **`carecore`** (no en `master`)
2. Verifica que tengas permisos de administrador
3. Intenta acceder desde otro navegador o en modo incógnito

### El Flujo Está Vacío o No Tiene Ejecutores

**Causa:** El flujo fue eliminado o nunca se configuró.

**Solución:**

1. Crea un nuevo flujo siguiendo el Paso 6
2. O importa un realm de backup si tienes uno

## 📋 Estructura Correcta del Flujo Browser

El flujo **Browser** debería verse así:

```
Browser Flow
├── Cookie (ALTERNATIVE)
│   └── [No sub-ejecutores necesarios]
├── Identity Provider Redirector (ALTERNATIVE)
│   └── [No sub-ejecutores necesarios]
└── Forms (REQUIRED)
    ├── Username Password Form (REQUIRED)
    │   └── [No sub-ejecutores necesarios]
    └── OTP Form (CONDITIONAL) [Opcional]
        └── [No sub-ejecutores necesarios]
```

**Reglas importantes:**

- ✅ Solo un elemento **REQUIRED** al nivel superior
- ✅ Los elementos **ALTERNATIVE** pueden estar al mismo nivel
- ✅ **OTP Form** debe ser **CONDITIONAL** (no REQUIRED)
- ✅ **OTP Form** debe estar **después** de **Username Password Form**

## 📚 Referencias

- [Keycloak Authentication Flows](https://www.keycloak.org/docs/latest/server_admin/#_authentication-flows)
- [Keycloak Authentication Executors](https://www.keycloak.org/docs/latest/server_admin/#_authentication-executors)
- [Keycloak OTP Configuration](https://www.keycloak.org/docs/latest/server_admin/#_otp)
