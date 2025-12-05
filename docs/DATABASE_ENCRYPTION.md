# Cifrado de Datos en Reposo - Base de Datos

Este documento describe la implementación del cifrado de datos en reposo para la base de datos PostgreSQL en CareCore.

## 📋 Tabla de Contenidos

- [Resumen](#resumen)
- [Cifrado a Nivel de Campo (pgcrypto)](#cifrado-a-nivel-de-campo-pgcrypto)
- [Cifrado de Disco (Volúmenes Docker)](#cifrado-de-disco-volúmenes-docker)
- [Configuración](#configuración)
- [Uso del Servicio de Cifrado](#uso-del-servicio-de-cifrado)
- [Mejores Prácticas](#mejores-prácticas)
- [Verificación](#verificación)

---

## 📊 Resumen

CareCore implementa **cifrado de datos en reposo** usando dos capas complementarias:

1. **Cifrado a nivel de campo (pgcrypto)**: Para datos sensibles específicos
2. **Cifrado de disco (volúmenes Docker)**: Para toda la base de datos

### Ventajas de cada enfoque

**pgcrypto (nivel de campo):**
- ✅ Cifrado granular (solo campos sensibles)
- ✅ Control fino sobre qué datos se cifran
- ✅ Permite búsquedas en campos no cifrados
- ⚠️ Requiere cambios en la aplicación
- ⚠️ Impacto en rendimiento para operaciones cifradas

**Cifrado de disco:**
- ✅ Transparente para la aplicación
- ✅ Protege todos los datos automáticamente
- ✅ Sin cambios en el código
- ⚠️ Cifra todo (no selectivo)
- ⚠️ Depende de la configuración del sistema/host

---

## 🔐 Cifrado a Nivel de Campo (pgcrypto)

### Descripción

El cifrado a nivel de campo usa la extensión `pgcrypto` de PostgreSQL para cifrar datos sensibles antes de almacenarlos en la base de datos.

### Implementación

1. **Extensión habilitada**: Migración `1700000000000-EnablePgcrypto.ts`
2. **Servicio de cifrado**: `EncryptionService` en `src/common/services/encryption.service.ts`
3. **Módulo común**: `CommonModule` exporta el servicio

### Configuración

**Variable de entorno requerida:**
```env
ENCRYPTION_KEY=<clave-de-cifrado-de-al-menos-32-caracteres>
```

**Generar una clave segura:**
```bash
# Opción 1: Usando OpenSSL
openssl rand -base64 32

# Opción 2: Usando el servicio (requiere conexión a BD)
# El servicio tiene un método generateRandomKey() para desarrollo
```

### Uso

```typescript
import { EncryptionService } from '@/common/services/encryption.service';

// Inyectar el servicio
constructor(private encryptionService: EncryptionService) {}

// Cifrar datos
const encrypted = await this.encryptionService.encrypt('dato sensible');
// Guardar 'encrypted' en la base de datos

// Descifrar datos
const decrypted = await this.encryptionService.decrypt(encrypted);
```

### Ejemplo en una Entidad

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { EncryptionService } from '@/common/services/encryption.service';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Campo que se cifra antes de guardar
  @Column({ type: 'text' })
  ssn: string; // Social Security Number

  // Método para cifrar antes de guardar
  async encryptSensitiveData(encryptionService: EncryptionService) {
    if (this.ssn) {
      this.ssn = await encryptionService.encrypt(this.ssn);
    }
  }

  // Método para descifrar después de leer
  async decryptSensitiveData(encryptionService: EncryptionService) {
    if (this.ssn) {
      this.ssn = await encryptionService.decrypt(this.ssn);
    }
  }
}
```

---

## 💾 Cifrado de Disco (Volúmenes Docker)

### Descripción

El cifrado de disco protege todos los datos almacenados en los volúmenes Docker, incluyendo la base de datos completa.

### Opciones de Implementación

#### Opción 1: Volúmenes Cifrados con Docker (Recomendado para Producción)

**Usando Docker con drivers de cifrado:**

```yaml
# docker-compose.production.yml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: crypt
      device: /path/to/encrypted/device
      o: defaults
```

**Nota:** Requiere configuración adicional del sistema operativo.

#### Opción 2: Cifrado a Nivel de Sistema Operativo (LUKS)

**En el host del servidor:**

```bash
# Crear volumen cifrado con LUKS
sudo cryptsetup luksFormat /dev/sdb
sudo cryptsetup luksOpen /dev/sdb encrypted_volume
sudo mkfs.ext4 /dev/mapper/encrypted_volume

# Montar el volumen
sudo mount /dev/mapper/encrypted_volume /var/lib/docker/volumes/carecore_postgres_data
```

#### Opción 3: Cifrado con Docker Secrets (Swarm Mode)

```yaml
# docker-compose.yml (Swarm mode)
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
    secrets:
      - db_encryption_key

secrets:
  db_encryption_key:
    external: true

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.example.com
```

### Configuración Recomendada para MVP

Para el MVP, recomendamos usar **cifrado a nivel de campo (pgcrypto)** para datos sensibles específicos, ya que:

1. ✅ Más simple de implementar
2. ✅ No requiere configuración adicional del sistema
3. ✅ Cumple con el DoD requerido
4. ✅ Permite control granular

Para producción, se debe implementar **cifrado de disco** adicional.

---

## ⚙️ Configuración

### Desarrollo

**Archivo: `.env.local`**
```env
# Cifrado
ENCRYPTION_KEY=<clave-generada-segura>
```

**Ejecutar migración:**
```bash
npm run migration:run
```

### Producción

**Variables de entorno:**
```env
ENCRYPTION_KEY=<clave-segura-de-al-menos-32-caracteres>
```

**Consideraciones:**
- ⚠️ **NUNCA** commitear `ENCRYPTION_KEY` al repositorio
- ⚠️ Usar un Key Management Service (KMS) en producción
- ⚠️ Rotar la clave periódicamente
- ⚠️ Almacenar la clave de forma segura (secrets manager)

---

## 🔧 Uso del Servicio de Cifrado

### Métodos Disponibles

#### `encrypt(plaintext: string): Promise<string>`

Cifra un string usando pgcrypto.

```typescript
const encrypted = await encryptionService.encrypt('dato sensible');
// Retorna: string base64 codificado
```

#### `decrypt(encryptedValue: string): Promise<string>`

Descifra un valor cifrado.

```typescript
const decrypted = await encryptionService.decrypt(encrypted);
// Retorna: string original
```

#### `isPgcryptoAvailable(): Promise<boolean>`

Verifica si la extensión pgcrypto está disponible.

```typescript
const available = await encryptionService.isPgcryptoAvailable();
if (!available) {
  throw new Error('pgcrypto extension not available');
}
```

#### `generateRandomKey(length?: number): Promise<string>`

Genera una clave aleatoria (solo para desarrollo/testing).

```typescript
const key = await encryptionService.generateRandomKey(32);
// Retorna: string base64 codificado
```

### Ejemplo Completo

```typescript
import { Injectable } from '@nestjs/common';
import { EncryptionService } from '@/common/services/encryption.service';

@Injectable()
export class PatientService {
  constructor(private encryptionService: EncryptionService) {}

  async createPatient(data: CreatePatientDto) {
    // Verificar que pgcrypto esté disponible
    const pgcryptoAvailable = await this.encryptionService.isPgcryptoAvailable();
    if (!pgcryptoAvailable) {
      throw new Error('Encryption not available');
    }

    // Cifrar datos sensibles
    const encryptedSSN = await this.encryptionService.encrypt(data.ssn);

    // Guardar en base de datos
    const patient = {
      ...data,
      ssn: encryptedSSN, // Campo cifrado
    };

    return this.patientRepository.save(patient);
  }

  async getPatient(id: string) {
    const patient = await this.patientRepository.findOne({ where: { id } });

    if (patient && patient.ssn) {
      // Descifrar datos sensibles
      patient.ssn = await this.encryptionService.decrypt(patient.ssn);
    }

    return patient;
  }
}
```

---

## ✅ Mejores Prácticas

### Seguridad

1. **Clave de cifrado:**
   - Mínimo 32 caracteres
   - Generada aleatoriamente
   - Almacenada de forma segura
   - Rotada periódicamente

2. **Gestión de claves:**
   - Usar un Key Management Service (KMS) en producción
   - AWS KMS, Google Cloud KMS, Azure Key Vault
   - Nunca hardcodear claves en el código

3. **Cifrado selectivo:**
   - Solo cifrar datos realmente sensibles
   - Considerar impacto en rendimiento
   - Documentar qué campos se cifran

### Rendimiento

1. **Cifrado asíncrono:**
   - El cifrado/descifrado es asíncrono
   - Considerar impacto en tiempo de respuesta
   - Usar índices en campos no cifrados para búsquedas

2. **Caché:**
   - Considerar caché de datos descifrados (con precaución)
   - Invalidar caché al actualizar datos

3. **Búsquedas:**
   - Los campos cifrados no se pueden buscar directamente
   - Usar campos hash o índices separados para búsquedas

### Desarrollo

1. **Testing:**
   - Probar cifrado/descifrado en tests
   - Verificar manejo de errores
   - Tests con claves incorrectas

2. **Logging:**
   - No loggear datos cifrados o descifrados
   - Loggear solo errores de cifrado (sin datos sensibles)

---

## 🔍 Verificación

### Verificar que pgcrypto esté habilitado

```bash
# Conectarse a PostgreSQL
docker exec -it carecore-postgres psql -U $DB_USER -d $DB_NAME

# Verificar extensión
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

### Verificar el servicio de cifrado

```typescript
// En un test o script
const available = await encryptionService.isPgcryptoAvailable();
console.log('pgcrypto available:', available);

// Probar cifrado/descifrado
const testData = 'test data';
const encrypted = await encryptionService.encrypt(testData);
const decrypted = await encryptionService.decrypt(encrypted);
console.log('Encryption works:', testData === decrypted);
```

### Script de Verificación

Usar el script incluido:

```bash
npm run encryption:verify
```

Este script verifica:
1. ✅ Que pgcrypto esté habilitado
2. ✅ Que `ENCRYPTION_KEY` esté configurada
3. ✅ Que el cifrado/descifrado funcione correctamente

---

## 📚 Referencias

- [PostgreSQL pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [Docker Volume Encryption](https://docs.docker.com/storage/volumes/)
- [LUKS Disk Encryption](https://gitlab.com/cryptsetup/cryptsetup)
- [AWS KMS](https://aws.amazon.com/kms/)
- [Google Cloud KMS](https://cloud.google.com/kms)

---

## ⚠️ Advertencias

1. **Pérdida de clave:**
   - Si se pierde `ENCRYPTION_KEY`, los datos cifrados NO se pueden recuperar
   - Mantener backups de la clave en lugar seguro
   - Usar rotación de claves con versionado

2. **Rendimiento:**
   - El cifrado/descifrado tiene un costo en rendimiento
   - Medir impacto en producción
   - Considerar cifrado selectivo

3. **Búsquedas:**
   - Los campos cifrados no se pueden buscar directamente
   - Usar índices hash o campos separados para búsquedas

4. **Backups:**
   - Los backups contienen datos cifrados
   - Asegurar que los backups también estén cifrados
   - Verificar que se pueda restaurar con la clave correcta

---

## ✅ DoD (Definition of Done)

Esta implementación cumple con el DoD requerido:

- ✅ **Base de datos disponible**: PostgreSQL configurado y funcionando
- ✅ **Cifrado a nivel de campo (pgcrypto)**: Extensión habilitada y servicio implementado
- ✅ **Cifrado de disco documentado**: Opciones documentadas para implementación en producción
- ✅ **Verificación**: Script de verificación disponible (`npm run encryption:verify`)


