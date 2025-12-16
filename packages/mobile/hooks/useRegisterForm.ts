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

export const useRegisterForm = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<PatientRegisterPayload>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para actualizar cualquier campo del formulario
  const handleChange = useCallback((key: keyof PatientRegisterPayload, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Función principal de envío del formulario
  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    // Validación básica
    if (!formData.username || formData.username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      setIsLoading(false);
      return false;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Por favor ingresa un email válido');
      setIsLoading(false);
      return false;
    }

    if (!formData.password || formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setIsLoading(false);
      return false;
    }

    if (!formData.name || formData.name.length === 0) {
      setError('Por favor ingresa al menos un nombre');
      setIsLoading(false);
      return false;
    }

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
  }, [formData, login]);

  return {
    formData,
    isLoading,
    error,
    handleChange,
    handleSubmit,
  };
};
