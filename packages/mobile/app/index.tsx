// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  const isAuthenticated = true;
  if (!isAuthenticated) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)" />;
}
