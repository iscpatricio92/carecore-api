// carecore-frontend/app/login/index.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
//import { useAuth } from '../../../hooks/useAuth';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { Link } from 'expo-router';
import logoImage from '../../../assets/images/logo.png';
import { router } from 'expo-router';
export default function LoginScreen() {
  //const { login } = useAuth();

  // Usaremos un estilo simple de 'botón de acción' para iniciar el flujo OIDC/Keycloak

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={logoImage} style={styles.logo} alt="CareCore Logo" />
        <Text style={styles.title}>Bienvenido a CareCore</Text>
        <Text style={styles.subtitle}>Control absoluto sobre tu historial clínico FHIR.</Text>

        {/* 1. BOTÓN PRINCIPAL: INICIA SESIÓN CON KEYCLOAK */}
        <PrimaryButton
          title="Iniciar Sesión"
          onPress={() => router.replace(true ? '/(tabs)' : '/auth/login')} // Llama al useAuth().login() que invoca promptAsync()
          style={styles.button}
        />

        {/* 2. ENLACE A REGISTRO */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>¿Aún no tienes cuenta?</Text>
          <Link href="/auth/register" style={styles.link}>
            Regístrate aquí
          </Link>
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
