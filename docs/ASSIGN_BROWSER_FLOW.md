# Asignar Flujo Browser en Keycloak

Esta guía explica cómo asignar el flujo **Browser** al realm para que se use en las autenticaciones OAuth2.

## 🎯 Problema

El flujo **Browser** aparece como "not in use", lo que significa que no está asignado al realm. Esto causa que Keycloak no sepa qué flujo usar para las autenticaciones OAuth2.

## ✅ Solución: Asignar el Flujo Browser

### Paso 1: Acceder a Keycloak Admin Console

1. Abre: `http://localhost:8080/admin`
2. Inicia sesión con tus credenciales de administrador
3. Selecciona el realm **`carecore`** (dropdown superior izquierdo)

### Paso 2: Ir a Authentication Bindings

1. En el menú lateral, ve a **Authentication**
2. Haz clic en la pestaña **Bindings** (no en "Flows")

### Paso 3: Asignar Flujo Browser

En la sección **Bindings**, verás varios campos:

1. **Browser Flow:** Selecciona **`browser`** del dropdown
   - Este es el flujo que se usa para autenticaciones OAuth2 desde navegadores/apps móviles

2. **Direct Grant Flow:** Selecciona **`direct grant`** (o el que prefieras)
   - Este se usa para autenticaciones directas (API, etc.)

3. **Registration Flow:** Selecciona **`registration`** (si existe)
   - Este se usa para el registro de usuarios

4. **Reset Credentials Flow:** Selecciona **`reset credentials`** (si existe)
   - Este se usa para resetear contraseñas

5. Haz clic en **Save**

### Paso 4: Verificar que el Flujo Browser Está Configurado Correctamente

1. Ve a la pestaña **Flows**
2. Busca el flujo **`browser`**
3. Verifica que ya no diga "not in use"
4. Haz clic en **`browser`** para ver su configuración

**Estructura correcta del flujo Browser:**

```
Browser Flow
├── Cookie (ALTERNATIVE)
├── Identity Provider Redirector (ALTERNATIVE)
└── Forms (REQUIRED)
    └── Username Password Form (REQUIRED)
```

**Si hay `Conditional OTP` al nivel superior, elimínalo** (ver guía `FIX_KEYCLOAK_AUTHENTICATION_FLOW.md`)

### Paso 5: Reiniciar Keycloak (Opcional pero Recomendado)

Después de asignar el flujo, reinicia Keycloak para asegurar que los cambios se apliquen:

```bash
docker-compose restart keycloak
```

Espera 30-60 segundos a que Keycloak esté listo.

### Paso 6: Probar Login

1. En la app móvil, intenta hacer login nuevamente
2. Keycloak debería mostrar el formulario de login correctamente

## 🐛 Troubleshooting

### El Flujo Browser No Aparece en el Dropdown

**Causa:** El flujo `browser` no existe o fue eliminado.

**Solución:**

1. Ve a **Authentication** → **Flows**
2. Si no ves `browser`, crea uno nuevo:
   - Haz clic en **Create flow**
   - **Alias:** `browser`
   - **Type:** `basic-flow`
   - **Create**
3. Agrega los ejecutores (ver `FIX_KEYCLOAK_AUTHENTICATION_FLOW.md`)

### Después de Asignar, Sigue Sin Funcionar

**Causa:** El flujo Browser puede estar mal configurado.

**Solución:**

1. Verifica que el flujo Browser tenga la estructura correcta
2. Elimina `Conditional OTP` del nivel superior si existe
3. Verifica que `Forms` → `Username Password Form` esté configurado como REQUIRED

### El Flujo Aparece como "not in use" Después de Asignarlo

**Causa:** Puede haber un problema con la configuración del realm.

**Solución:**

1. Verifica que estés en el realm correcto (`carecore`, no `master`)
2. Guarda los cambios nuevamente
3. Reinicia Keycloak
4. Verifica que el flujo esté correctamente configurado

## 📋 Checklist de Verificación

- [ ] Estás en el realm `carecore` (no `master`)
- [ ] El flujo `browser` existe en **Authentication** → **Flows**
- [ ] El flujo `browser` está asignado en **Authentication** → **Bindings** → **Browser Flow**
- [ ] El flujo `browser` tiene la estructura correcta (sin Conditional OTP al nivel superior)
- [ ] Keycloak fue reiniciado después de los cambios
- [ ] El formulario de login aparece cuando intentas hacer login desde la app

## 📚 Referencias

- [Keycloak Authentication Bindings](https://www.keycloak.org/docs/latest/server_admin/#_authentication-bindings)
- [Corregir Flujo de Autenticación](./FIX_KEYCLOAK_AUTHENTICATION_FLOW.md)
- [Keycloak Authentication Flows](https://www.keycloak.org/docs/latest/server_admin/#_authentication-flows)
