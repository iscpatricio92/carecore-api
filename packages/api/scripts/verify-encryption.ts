#!/usr/bin/env ts-node
/**
 * Script de verificación de cifrado
 *
 * Verifica que:
 * 1. La extensión pgcrypto esté habilitada
 * 2. La variable ENCRYPTION_KEY esté configurada
 * 3. El cifrado/descifrado funcione correctamente
 *
 * Uso:
 *   npx ts-node scripts/verify-encryption.ts
 */

import { AppDataSource } from '../src/config/data-source';
import { EncryptionService } from '../src/common/services/encryption.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

async function verifyEncryption() {
  console.log('🔍 Verificando configuración de cifrado...\n');

  try {
    // Inicializar DataSource
    console.log('📡 Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✅ Conexión establecida\n');

    const configService = new ConfigService();
    const encryptionService = new EncryptionService(
      configService,
      AppDataSource as unknown as DataSource,
    );

    // 1. Verificar pgcrypto
    console.log('1️⃣ Verificando extensión pgcrypto...');
    const available = await encryptionService.isPgcryptoAvailable();
    if (!available) {
      console.error('❌ pgcrypto extension not available');
      console.error('   Ejecuta: npm run migration:run');
      process.exit(1);
    }
    console.log('   ✅ pgcrypto está habilitado\n');

    // 2. Verificar clave de cifrado
    console.log('2️⃣ Verificando variable ENCRYPTION_KEY...');
    const key = configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      console.error('❌ ENCRYPTION_KEY not set');
      console.error('   Configura ENCRYPTION_KEY en .env.local');
      process.exit(1);
    }
    if (key.length < 32) {
      console.warn('⚠️  ENCRYPTION_KEY es muy corta (mínimo 32 caracteres recomendado)');
    } else {
      console.log('   ✅ ENCRYPTION_KEY está configurada');
    }
    console.log(`   Longitud: ${key.length} caracteres\n`);

    // 3. Probar cifrado/descifrado
    console.log('3️⃣ Probando cifrado/descifrado...');
    const testData = 'test encryption data - ' + new Date().toISOString();
    console.log(`   Datos de prueba: "${testData.substring(0, 30)}..."`);

    const encrypted = await encryptionService.encrypt(testData);
    console.log('   ✅ Cifrado exitoso');
    console.log(`   Valor cifrado: ${encrypted.substring(0, 50)}...`);

    const decrypted = await encryptionService.decrypt(encrypted);
    console.log('   ✅ Descifrado exitoso');

    if (testData === decrypted) {
      console.log('   ✅ Los datos coinciden (cifrado/descifrado correcto)\n');
    } else {
      console.error('   ❌ Los datos no coinciden');
      console.error(`   Original: ${testData}`);
      console.error(`   Descifrado: ${decrypted}`);
      process.exit(1);
    }

    // 4. Verificar que datos diferentes producen cifrados diferentes
    console.log('4️⃣ Verificando que el cifrado es determinístico...');
    const testData2 = 'otro dato de prueba';
    const encrypted2 = await encryptionService.encrypt(testData2);
    const decrypted2 = await encryptionService.decrypt(encrypted2);

    if (testData2 === decrypted2 && encrypted !== encrypted2) {
      console.log('   ✅ Cifrado funciona correctamente (valores diferentes)\n');
    } else {
      console.error('   ❌ Problema con el cifrado');
      process.exit(1);
    }

    console.log('🎉 Verificación completada exitosamente');
    console.log('\n✅ El sistema de cifrado está configurado correctamente');
  } catch (error) {
    console.error('\n❌ Error durante la verificación:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n📡 Conexión cerrada');
    }
  }
}

// Ejecutar verificación
verifyEncryption().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
