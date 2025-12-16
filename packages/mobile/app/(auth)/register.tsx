// carecore-frontend/app/(auth)/register.tsx
// Register screen - accessible at /register (not /auth/register)

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useRegisterForm } from '../../hooks/useRegisterForm';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { FormInput } from '../../components/ui/FormInput';
import logoImage from '../../assets/images/logo.png';

export default function RegisterScreen() {
  const { formData, isLoading, error, handleChange, handleSubmit } = useRegisterForm();

  const onSubmit = async () => {
    const success = await handleSubmit();
    if (success) {
      // Si el registro fue exitoso (el useAuth ya actualizó el estado)
      // Redirigir a la pantalla principal (Dashboard)
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error de Registro', error || 'Por favor, revisa tus datos.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={logoImage} style={styles.logo} alt="CareCore Logo" />
        <Text style={styles.title}>Registro de Paciente</Text>
        <Text style={styles.subtitle}>Crea tu cuenta y tu primer perfil Patient FHIR.</Text>

        {/* ========================================================== */}
        {/* Ejemplo Básico de Campos (Debes construir el formulario completo) */}
        {/* ========================================================== */}

        <FormInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => handleChange('email', text)}
          keyboardType="email-address"
          placeholder="email@ejemplo.com"
        />
        <FormInput
          label="Contraseña"
          value={formData.password}
          onChangeText={(text) => handleChange('password', text)}
          secureTextEntry
        />
        <FormInput
          label="Primer Nombre"
          // **NOTA:** La manipulación de los campos 'name' (FHIR arrays) es más compleja.
          // Tendrás que manejar la actualización del array name[0].given[0] en tu handleChange.
          value={formData.name[0]?.given?.[0] || ''}
          placeholder="John"
        />

        {/* Mostrar Errores */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Botón de envío */}
        <PrimaryButton
          title={isLoading ? 'Registrando...' : 'Confirmar Registro'}
          onPress={onSubmit}
          disabled={isLoading}
          style={styles.button}
        />

        <Text
          onPress={() => {
            router.push('/login');
          }}
          style={styles.backLink}
        >
          ← Volver a Iniciar Sesión
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004D40',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  loader: {
    marginTop: 10,
  },
  button: {
    width: '100%',
    marginVertical: 10,
  },
  backLink: {
    marginTop: 30,
    color: '#00796B',
    fontWeight: '600',
  },
  logo: {
    width: 250,
    height: 150,
    marginBottom: 0,
    resizeMode: 'cover',
  },
});
