// carecore-frontend/app/(auth)/_layout.tsx
// Layout for authentication routes (login, register)
// Route group: (auth) doesn't appear in the URL

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
