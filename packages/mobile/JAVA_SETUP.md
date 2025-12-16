# Configuración de Java para Android

## ✅ Java Instalado

Java 17 (OpenJDK) ha sido instalado usando Homebrew y configurado en tu `~/.zshrc`.

## 🔄 Recargar la Configuración

**IMPORTANTE**: Para que las variables tomen efecto, recarga tu terminal:

```bash
source ~/.zshrc
```

O cierra y abre una nueva terminal.

## ✅ Verificar Instalación

Después de recargar, verifica que Java funcione:

```bash
# Verificar versión de Java
java -version
# Debería mostrar: openjdk version "17.x.x"

# Verificar JAVA_HOME
echo $JAVA_HOME
# Debería mostrar: /opt/homebrew/opt/openjdk@17

# Verificar que javac está disponible
which javac
# Debería mostrar: /opt/homebrew/opt/openjdk@17/bin/javac
```

## 🚀 Ejecutar la App en Android

Una vez que Java esté configurado:

```bash
npm run android
```

## ⚠️ Solución de Problemas

### Error: "Unable to locate a Java Runtime"
1. **Recarga la terminal**:
   ```bash
   source ~/.zshrc
   ```

2. **Verifica que Java esté instalado**:
   ```bash
   brew list openjdk@17
   ```

3. **Si no está instalado, instálalo**:
   ```bash
   brew install openjdk@17
   ```

4. **Exporta manualmente en la sesión actual**:
   ```bash
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   export PATH=$JAVA_HOME/bin:$PATH
   ```

### Error: "JAVA_HOME is not set"
1. **Verifica que JAVA_HOME esté en `.zshrc`**:
   ```bash
   grep JAVA_HOME ~/.zshrc
   ```

2. **Si no está, agrega estas líneas a `~/.zshrc`**:
   ```bash
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   export PATH=$JAVA_HOME/bin:$PATH
   ```

3. **Recarga la terminal**:
   ```bash
   source ~/.zshrc
   ```

### Verificar que Gradle encuentra Java
```bash
cd packages/mobile/android
./gradlew --version
```

Debería mostrar la versión de Java que está usando.

## 📚 Referencias

- [OpenJDK 17](https://openjdk.org/projects/jdk/17/)
- [Android Java Requirements](https://developer.android.com/studio/releases/gradle-plugin#java-version)
- [Expo Android Requirements](https://docs.expo.dev/workflow/android-studio-emulator/)
