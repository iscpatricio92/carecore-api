// carecore-frontend/app/_layout.tsx (Adaptado)

/* This file is the root layout of the app, it wraps the app in the AuthProvider and the Layout component */
/* It also handles the authentication state and redirects the user to the login screen if they are not authenticated */
import { Stack } from 'expo-router';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { AuthProvider } from '../hooks/useAuth';

// 1. Componente que contiene las rutas de la aplicación
function RootLayoutContent() {
  // Muestra las rutas de la aplicación (incluyendo las tabs)
  // La redirección de auth se maneja en app/index.tsx
  // Expo Router detecta automáticamente las rutas basándose en la estructura de archivos
  return <Stack screenOptions={{ headerShown: false }} />;
}

// 2. El exportador principal envuelve todo con el AuthProvider y ErrorBoundary
// Note: ErrorBoundary deshabilitado temporalmente en web debido a bug conocido de Expo Router 3.5.24
export default function RootLayout() {
  const content = (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );

  // ErrorBoundary habilitado para todas las plataformas con SDK 54
  return <ErrorBoundary>{content}</ErrorBoundary>;
}
