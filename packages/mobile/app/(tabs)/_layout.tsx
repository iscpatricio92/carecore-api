// carecore-frontend/app/(tabs)/_layout.tsx
/* This folder uses the tab layout to navigate between the different screens */
/* Define the BottomNavBar for all routes within (tabs) */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index" // Esta es tu pantalla principal (Dashboard)
        options={{
          headerShown: false,
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Ionicons name="home" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="history" // Pantalla de Historial Clínico Completo
        options={{
          headerShown: false,
          title: 'Historial',
          tabBarIcon: ({ color }) => <Ionicons name="folder-open" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="settings" // Pantalla de Configuración/Perfil
        options={{
          headerShown: false,
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
