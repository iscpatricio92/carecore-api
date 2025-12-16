// carecore-frontend/app/_layout.tsx (Adaptado)

/* This file is the root layout of the app, it wraps the app in the AuthProvider and the Layout component */
/* It also handles the authentication state and redirects the user to the login screen if they are not authenticated */
import { Stack } from 'expo-router';
//import { AuthProvider, useAuth } from '../hooks/useAuth'; // Importa el hook de autenticación

// 1. Componente que contiene la lógica de redirección
function RootLayoutContent() {
  //const { isAuthenticated, isLoading } = useAuth();

  /*  if (isLoading) {
    return <Text>Cargando sesión de CareCore...</Text>;
  } */

  // Redirige al Login si no está autenticado (debes crear la ruta 'login.tsx')
  /*   if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  } */

  // Muestra las rutas de la aplicación (incluyendo las tabs)
  return <Stack screenOptions={{ headerShown: false }} />;
}

// 2. El exportador principal envuelve todo con el AuthProvider
export default function RootLayout() {
  return (
    //<AuthProvider>
    <RootLayoutContent />
    //</AuthProvider>
  );
}
