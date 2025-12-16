// carecore-frontend/app/(auth)/login.tsx
// Login screen - accessible at /login (not /auth/login)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { router } from 'expo-router';
import { ErrorService } from '../../services/ErrorService';
import logoImage from '../../assets/images/logo.png';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
    } catch (error) {
      const errorInfo = ErrorService.handleAuthError(error, { operation: 'handleLogin' });
      Alert.alert('Error de Autenticación', ErrorService.getUserFriendlyMessage(errorInfo));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={logoImage} style={styles.logo} alt="CareCore Logo" />
        <Text style={styles.title}>Bienvenido a CareCore</Text>
        <Text style={styles.subtitle}>Control absoluto sobre tu historial clínico FHIR.</Text>

        {/* Botón de inicio de sesión */}
        <PrimaryButton
          title={isLoggingIn || isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          onPress={handleLogin}
          disabled={isLoggingIn || isLoading}
          style={styles.button}
        />

        {(isLoggingIn || isLoading) && (
          <ActivityIndicator size="small" color="#00796B" style={styles.loader} />
        )}

        {/* Enlace a registro */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>¿Aún no tienes cuenta?</Text>
          <Text
            onPress={() => {
              router.push('/register');
            }}
            style={styles.link}
          >
            Regístrate aquí
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logo: {
    width: 250,
    height: 150,
    marginBottom: 0,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 28,
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
  linkContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  linkText: {
    color: '#666',
    marginRight: 5,
  },
  link: {
    color: '#00796B', // Verde aguamarina
    fontWeight: 'bold',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
});
