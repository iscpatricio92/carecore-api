// carecore-frontend/app/(auth)/register.tsx
// Register screen - accessible at /register (not /auth/register)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useRegisterForm } from '../../hooks/useRegisterForm';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { FormInput } from '../../components/ui/FormInput';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { ErrorType } from '@carecore/shared';
import { Ionicons } from '@expo/vector-icons';
import logoImage from '../../assets/images/logo.png';

// Importar DateTimePicker solo para plataformas nativas
let DateTimePicker: React.ComponentType<{
  value: Date;
  mode: 'date';
  display: 'default' | 'spinner';
  onChange: (event: unknown, date?: Date) => void;
  maximumDate: Date;
  minimumDate: Date;
}> | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function RegisterScreen() {
  const { formData, isLoading, error, fieldErrors, handleChange, handleSubmit } = useRegisterForm();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    formData.birthDate ? new Date(formData.birthDate) : new Date(2000, 0, 1),
  );

  const onSubmit = async () => {
    const success = await handleSubmit();
    if (success) {
      // Si el registro fue exitoso (el useAuth ya actualizó el estado)
      // Redirigir a la pantalla principal (Dashboard)
      router.replace('/(tabs)');
    }
  };

  // Helper para actualizar el campo firstName dentro del array name
  const handleFirstNameChange = (text: string) => {
    const updatedName = [
      {
        use: 'official' as const,
        given: [text],
        family: formData.name[0]?.family || '',
      },
    ];
    handleChange('name', updatedName);
  };

  // Helper para manejar cambios en la fecha de nacimiento
  const handleDateChange = (event: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      // Formatear fecha como YYYY-MM-DD (ISO 8601)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      handleChange('birthDate', formattedDate);
    }
  };

  // Helper para formatear fecha para mostrar
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const genderOptions: Array<{ value: 'male' | 'female' | 'other' | 'unknown'; label: string }> = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
    { value: 'other', label: 'Otro' },
    { value: 'unknown', label: 'Prefiero no decir' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Image source={logoImage} style={styles.logo} alt="CareCore Logo" />
          <Text style={styles.title}>Registro de Paciente</Text>
          <Text style={styles.subtitle}>Crea tu cuenta y tu primer perfil Patient FHIR.</Text>

          <FormInput
            label="Nombre de Usuario"
            value={formData.username}
            onChangeText={(text) => handleChange('username', text)}
            placeholder="usuario123"
            autoCapitalize="none"
            error={fieldErrors.username}
            iconName="person-outline"
          />

          <FormInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            keyboardType="email-address"
            placeholder="email@ejemplo.com"
            autoCapitalize="none"
            error={fieldErrors.email}
            iconName="mail-outline"
          />

          <FormInput
            label="Contraseña"
            value={formData.password}
            onChangeText={(text) => handleChange('password', text)}
            secureTextEntry
            placeholder="Mínimo 8 caracteres"
            error={fieldErrors.password}
            iconName="lock-closed-outline"
          />

          <FormInput
            label="Primer Nombre"
            value={formData.name[0]?.given?.[0] || ''}
            onChangeText={handleFirstNameChange}
            placeholder="John"
            error={fieldErrors.firstName}
            iconName="person-outline"
          />

          {/* Fecha de Nacimiento */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fecha de Nacimiento</Text>
            {Platform.OS === 'web' ? (
              // Input nativo de fecha para web
              <View style={[styles.dateInput, fieldErrors.birthDate && styles.inputError]}>
                <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
                <TextInput
                  style={styles.dateInputWeb}
                  type="date"
                  value={formData.birthDate}
                  onChangeText={(text) => handleChange('birthDate', text)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                />
              </View>
            ) : (
              // DateTimePicker para iOS/Android
              <>
                <TouchableOpacity
                  style={[styles.dateInput, fieldErrors.birthDate && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
                  <Text style={[styles.dateText, !formData.birthDate && styles.placeholder]}>
                    {formData.birthDate
                      ? formatDateForDisplay(formData.birthDate)
                      : 'Selecciona tu fecha de nacimiento'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                {showDatePicker && DateTimePicker && (
                  <>
                    <DateTimePicker
                      value={selectedDate || new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                    />
                    {Platform.OS === 'ios' && (
                      <View style={styles.iosDatePickerContainer}>
                        <TouchableOpacity
                          style={styles.iosDatePickerButton}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.iosDatePickerButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
            {fieldErrors.birthDate && <Text style={styles.errorText}>{fieldErrors.birthDate}</Text>}
          </View>

          {/* Género */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Género</Text>
            <View style={styles.genderContainer}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    formData.gender === option.value && styles.genderOptionActive,
                  ]}
                  onPress={() => handleChange('gender', option.value)}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      formData.gender === option.value && styles.genderOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {fieldErrors.gender && <Text style={styles.errorText}>{fieldErrors.gender}</Text>}
          </View>

          {/* Mostrar Error General */}
          {error && (
            <ErrorMessage message={error} type={ErrorType.VALIDATION} style={styles.errorMessage} />
          )}

          {/* Botón de envío */}
          <PrimaryButton
            title={isLoading ? 'Registrando...' : 'Confirmar Registro'}
            onPress={onSubmit}
            disabled={isLoading}
            style={styles.button}
          />

          <Text
            onPress={() => {
              router.push('/login');
            }}
            style={styles.backLink}
          >
            ← Volver a Iniciar Sesión
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004D40',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  loader: {
    marginTop: 10,
  },
  button: {
    width: '100%',
    marginVertical: 10,
  },
  backLink: {
    marginTop: 30,
    color: '#00796B',
    fontWeight: '600',
  },
  logo: {
    width: 250,
    height: 150,
    marginBottom: 0,
    resizeMode: 'cover',
  },
  errorMessage: {
    marginVertical: 10,
  },
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  placeholder: {
    color: '#999',
  },
  dateInputWeb: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    paddingVertical: 0,
    borderWidth: 0,
    outline: 'none',
  },
  icon: {
    marginRight: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 5,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  genderOptionActive: {
    borderColor: '#00796B',
    backgroundColor: '#E0F2F1',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#666',
  },
  genderOptionTextActive: {
    color: '#00796B',
    fontWeight: '600',
  },
  iosDatePickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    padding: 10,
  },
  iosDatePickerButton: {
    backgroundColor: '#00796B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  iosDatePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
