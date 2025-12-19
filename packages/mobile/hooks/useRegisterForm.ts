// carecore-frontend/hooks/useRegisterForm.ts

import { useState, useCallback } from 'react';
import { PatientRegisterPayload } from '@carecore/shared';
import { registerService } from '../services/RegisterService';
import { useAuth } from './useAuth';

// Estado inicial del formulario
const initialFormState: PatientRegisterPayload = {
  username: '',
  email: '',
  password: '',
  name: [], // Inicialmente vacío, se debe completar
  identifier: [],
  telecom: [],
  gender: 'unknown',
  birthDate: '',
  address: [],
  active: true,
};

// Interface para errores de validación por campo
interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  birthDate?: string;
  gender?: string;
}

export const useRegisterForm = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<PatientRegisterPayload>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Validar un campo individual
  const validateField = useCallback((field: keyof FieldErrors, value: string): string | null => {
    switch (field) {
      case 'username':
        if (!value || value.length < 3) {
          return 'El nombre de usuario debe tener al menos 3 caracteres';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          return 'El nombre de usuario solo puede contener letras, números y guiones bajos';
        }
        return null;
      case 'email':
        if (!value) {
          return 'El email es requerido';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Por favor ingresa un email válido';
        }
        return null;
      case 'password':
        if (!value || value.length < 8) {
          return 'La contraseña debe tener al menos 8 caracteres';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
        }
        return null;
      case 'firstName':
        if (!value || value.trim().length < 2) {
          return 'El nombre debe tener al menos 2 caracteres';
        }
        return null;
      case 'birthDate':
        if (!value) {
          return 'La fecha de nacimiento es requerida';
        }
        // Validar formato YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return 'La fecha debe estar en formato YYYY-MM-DD (ej: 1990-01-15)';
        }
        // Validar que sea una fecha válida
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'La fecha de nacimiento no es válida';
        }
        // Validar que no sea en el futuro
        if (date > new Date()) {
          return 'La fecha de nacimiento no puede ser en el futuro';
        }
        // Validar que la persona tenga al menos 1 año
        const age = new Date().getFullYear() - date.getFullYear();
        if (age < 1) {
          return 'La fecha de nacimiento debe ser válida';
        }
        return null;
      case 'gender':
        if (!value) {
          return 'El género es requerido';
        }
        return null;
      default:
        return null;
    }
  }, []);

  // Función para actualizar cualquier campo del formulario
  const handleChange = useCallback((key: keyof PatientRegisterPayload, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (
      key === 'username' ||
      key === 'email' ||
      key === 'password' ||
      key === 'birthDate' ||
      key === 'gender'
    ) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    setError(null);
  }, []);

  // Validar todos los campos
  const validateAll = useCallback((): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Validar username
    const usernameError = validateField('username', formData.username || '');
    if (usernameError) {
      errors.username = usernameError;
      isValid = false;
    }

    // Validar email
    const emailError = validateField('email', formData.email || '');
    if (emailError) {
      errors.email = emailError;
      isValid = false;
    }

    // Validar password
    const passwordError = validateField('password', formData.password || '');
    if (passwordError) {
      errors.password = passwordError;
      isValid = false;
    }

    // Validar nombre
    const firstName = formData.name[0]?.given?.[0] || '';
    const firstNameError = validateField('firstName', firstName);
    if (firstNameError) {
      errors.firstName = firstNameError;
      isValid = false;
    }

    // Validar fecha de nacimiento
    const birthDateError = validateField('birthDate', formData.birthDate || '');
    if (birthDateError) {
      errors.birthDate = birthDateError;
      isValid = false;
    }

    // Validar género
    const genderError = validateField('gender', formData.gender || '');
    if (genderError) {
      errors.gender = genderError;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  }, [formData, validateField]);

  // Función principal de envío del formulario
  const handleSubmit = useCallback(async () => {
    setError(null);
    setFieldErrors({});

    // Validar todos los campos
    if (!validateAll()) {
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);

    try {
      // 1. Registrar al paciente (esto NO devuelve tokens)
      await registerService.registerPatient(formData);

      // 2. Después del registro exitoso, hacer login automáticamente para obtener tokens
      // El login iniciará el flujo OAuth2/PKCE que obtendrá los tokens
      await login();

      return true; // Éxito
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido durante el registro';
      console.error('Fallo de registro:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [formData, login, validateAll]);

  return {
    formData,
    isLoading,
    error,
    fieldErrors,
    handleChange,
    handleSubmit,
    validateField,
  };
};
