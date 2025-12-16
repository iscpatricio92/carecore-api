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
  return <Stack screenOptions={{ headerShown: false }} />;
}

// 2. El exportador principal envuelve todo con el AuthProvider y ErrorBoundary
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
