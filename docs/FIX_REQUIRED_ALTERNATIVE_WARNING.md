# Solución: Warning "REQUIRED and ALTERNATIVE elements at same level"

Esta guía explica cómo resolver el warning de Keycloak sobre elementos REQUIRED y ALTERNATIVE al mismo nivel.

## 🎯 Problema

El warning en los logs muestra:

```
REQUIRED and ALTERNATIVE elements at same level! Those alternative executions will be ignored: [auth-cookie, identity-provider-redirector]
```

**Causa:** Hay un elemento **REQUIRED** (como `form group` o `Forms`) al mismo nivel que elementos **ALTERNATIVE** (`Cookie`, `Identity Provider Redirector`). Keycloak ignora los elementos ALTERNATIVE cuando hay un REQUIRED al mismo nivel.

## ✅ Solución Rápida: Cambiar Forms a ALTERNATIVE

### Paso 1: Acceder al Flujo Browser

1. Keycloak Admin Console → Realm `carecore`
2. **Authentication** → **Flows**
3. Haz clic en el flujo **`browser`**

### Paso 2: Cambiar Requirement de form group

1. En el flujo, busca **`form group`** (o **`Forms`**)
2. Haz clic en el ícono de configuración (⚙️) junto a **`form group`**
3. O haz clic en el menú (⋮) → **Config**

4. En la configuración, busca **Requirement**
5. Cambia de **REQUIRED** a **ALTERNATIVE**
6. Haz clic en **Save**

### Paso 3: Verificar Estructura

La estructura debería quedar así:

```
Browser Flow
├── Cookie (ALTERNATIVE)
├── Identity Provider Redirector (ALTERNATIVE)
└── form group (ALTERNATIVE) ← Cambiado a ALTERNATIVE
    ├── Username Password Form (REQUIRED)
    └── Conditional OTP Form (CONDITIONAL o DISABLED)
```

### Paso 4: Probar

1. Reinicia Keycloak (opcional):

   ```bash
   docker-compose restart keycloak
   ```

2. Intenta hacer login desde la app móvil
3. El warning debería desaparecer y el formulario de login debería aparecer

## 🔍 Solución Alternativa: Reorganizar el Flujo

Si cambiar a ALTERNATIVE no funciona o prefieres mantener Forms como REQUIRED:

### Opción: Crear Sub-Flow para Forms

1. **Eliminar el `form group` actual:**
   - Haz clic en el menú (⋮) junto a `form group`
   - Selecciona **Delete**

2. **Crear nuevo sub-flow:**
   - Haz clic en **Add sub-flow**
   - **Alias:** `forms-subflow`
   - **Type:** `basic-flow`
   - **Requirement:** **ALTERNATIVE**
   - **Create**

3. **Agregar Username Password Form al sub-flow:**
   - Haz clic en **Add execution** (dentro del sub-flow)
   - Selecciona **Username Password Form** → **Add**
   - Configura como **REQUIRED**
   - **Save**

4. **Estructura final:**
   ```
   Browser Flow
   ├── Cookie (ALTERNATIVE)
   ├── Identity Provider Redirector (ALTERNATIVE)
   └── forms-subflow (ALTERNATIVE)
       └── Username Password Form (REQUIRED)
   ```

## 📋 Estructura Correcta del Flujo Browser

La estructura ideal para evitar el warning es:

### Opción 1: Todo ALTERNATIVE al Nivel Superior

```
Browser Flow
├── Cookie (ALTERNATIVE)
├── Identity Provider Redirector (ALTERNATIVE)
└── Forms (ALTERNATIVE) ← Cambiado a ALTERNATIVE
    └── Username Password Form (REQUIRED)
```

### Opción 2: Sub-Flow para Forms

```
Browser Flow
├── Cookie (ALTERNATIVE)
├── Identity Provider Redirector (ALTERNATIVE)
└── forms-subflow (ALTERNATIVE) ← Sub-flow
    └── Username Password Form (REQUIRED)
```

## ⚠️ Importante

**¿Por qué Keycloak ignora los ALTERNATIVE cuando hay un REQUIRED?**

- Los elementos **REQUIRED** deben ejecutarse siempre
- Los elementos **ALTERNATIVE** son opcionales
- Si hay un REQUIRED al mismo nivel, Keycloak asume que los ALTERNATIVE no son necesarios y los ignora

**Solución:** Asegúrate de que solo haya elementos **ALTERNATIVE** al nivel superior, o que el único REQUIRED esté dentro de un sub-flow.

## 🐛 Troubleshooting

### El Warning Persiste Después de Cambiar a ALTERNATIVE

**Causa:** Puede haber otro elemento REQUIRED al mismo nivel.

**Solución:**

1. Revisa todo el flujo Browser
2. Verifica que no haya otros elementos REQUIRED al nivel superior
3. Todos los elementos al nivel superior deben ser ALTERNATIVE

### El Login No Funciona Después de Cambiar a ALTERNATIVE

**Causa:** Cambiar Forms a ALTERNATIVE puede hacer que el flujo no se ejecute si los otros ALTERNATIVE se ejecutan primero.

**Solución:**

1. Usa la solución alternativa (crear sub-flow)
2. O asegúrate de que `Username Password Form` esté configurado correctamente dentro de Forms

## 📚 Referencias

- [Keycloak Authentication Flows](https://www.keycloak.org/docs/latest/server_admin/#_authentication-flows)
- [Keycloak Flow Requirements](https://www.keycloak.org/docs/latest/server_admin/#_authentication-executors)
