import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LoadingSpinnerProps {
  /** Mensaje opcional a mostrar debajo del spinner */
  message?: string;
  /** Tamaño del spinner: 'small' | 'large' */
  size?: 'small' | 'large';
  /** Color del spinner (por defecto usa el color primario del tema) */
  color?: string;
}

/**
 * Componente de carga para mostrar durante operaciones asíncronas
 */
export function LoadingSpinner({
  message,
  size = 'large',
  color = '#007AFF', // Color primario iOS/Expo
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
