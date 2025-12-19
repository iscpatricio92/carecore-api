import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorType } from '@carecore/shared';

interface ErrorMessageProps {
  /** Mensaje de error a mostrar */
  message: string;
  /** Tipo de error (opcional, para personalizar el ícono) */
  type?: ErrorType;
  /** Función a ejecutar cuando se presiona "Reintentar" */
  onRetry?: () => void;
  /** Texto del botón de retry (por defecto "Reintentar") */
  retryText?: string;
  /** Si es true, muestra el botón de retry */
  showRetry?: boolean;
  /** Estilo personalizado para el contenedor */
  style?: object;
}

/**
 * Componente para mostrar mensajes de error de forma amigable
 * Incluye opción de retry para errores de red
 */
export function ErrorMessage({
  message,
  type = ErrorType.UNKNOWN,
  onRetry,
  retryText = 'Reintentar',
  showRetry = false,
  style,
}: ErrorMessageProps) {
  // Determinar ícono según el tipo de error
  const getIcon = () => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'cloud-offline-outline';
      case ErrorType.AUTH:
        return 'lock-closed-outline';
      case ErrorType.VALIDATION:
        return 'alert-circle-outline';
      case ErrorType.FHIR:
        return 'medical-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  // Determinar color según el tipo de error
  const getColor = () => {
    switch (type) {
      case ErrorType.NETWORK:
        return '#FF7043'; // Naranja
      case ErrorType.AUTH:
        return '#F44336'; // Rojo
      case ErrorType.VALIDATION:
        return '#FFA726'; // Naranja claro
      case ErrorType.FHIR:
        return '#42A5F5'; // Azul
      default:
        return '#757575'; // Gris
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons name={getIcon()} size={32} color={getColor()} style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
        {showRetry && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh-outline" size={18} color="#00796B" />
            <Text style={styles.retryText}>{retryText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFF3E0', // Fondo naranja muy claro
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginVertical: 10,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E0F2F1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00796B',
  },
  retryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#00796B',
  },
});
