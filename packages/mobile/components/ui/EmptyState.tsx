import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  /** Título principal del estado vacío */
  title: string;
  /** Mensaje descriptivo opcional */
  message?: string;
  /** Nombre del icono de Ionicons (por defecto: 'document-outline') */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Acción opcional a mostrar (botón o texto) */
  action?: React.ReactNode;
}

/**
 * Componente para mostrar estados vacíos cuando no hay datos
 */
export function EmptyState({
  title,
  message,
  iconName = 'document-outline',
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={iconName} size={64} color="#CCC" style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionContainer: {
    marginTop: 8,
  },
});
