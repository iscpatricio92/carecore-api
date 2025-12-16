// carecore-frontend/components/ui/FormInput.tsx

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps, // Para heredar todas las propiedades estándar del TextInput
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Para íconos de validación o prefijos

// Propiedades específicas que queremos que el componente acepte
interface FormInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  iconName?: keyof typeof Ionicons.glyphMap; // Nombre opcional del ícono
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  containerStyle,
  iconName,
  style, // El estilo del TextInput se hereda y se usa al final
  ...rest // El resto de las propiedades estándar de TextInput (value, onChangeText, etc.)
}) => {
  // Determinar si hay un error para aplicar estilos visuales
  const hasError = !!error;

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {/* 1. Etiqueta (Label) */}
      <Text style={styles.label}>{label}</Text>

      {/* 2. Área del Input con Ícono */}
      <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
        {/* Ícono de Prefijo Opcional */}
        {iconName && (
          <Ionicons
            name={iconName}
            size={20}
            color={hasError ? '#D32F2F' : '#666'}
            style={styles.icon}
          />
        )}

        {/* El Campo de Texto Principal */}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#999"
          // Aplicar todas las demás propiedades pasadas como props
          {...rest}
        />

        {/* Ícono de Validación o Error (Opcional) */}
        {hasError ? (
          <Ionicons name="alert-circle" size={20} color="#D32F2F" style={styles.validationIcon} />
        ) : rest.value && rest.value.length > 0 && !hasError ? (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#00796B"
            style={styles.validationIcon}
          />
        ) : null}
      </View>

      {/* 3. Mensaje de Error */}
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
  },
  inputWrapperError: {
    borderColor: '#D32F2F', // Color rojo para error
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  validationIcon: {
    marginLeft: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 5,
  },
});
