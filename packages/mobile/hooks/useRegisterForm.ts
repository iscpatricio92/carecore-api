// carecore-frontend/hooks/useRegisterForm.ts

import { useState, useCallback } from 'react';
import { PatientRegisterPayload } from '@carecore/shared';
import { registerService } from '../services/RegisterService';
//import { useAuth } from './useAuth';

// Simplificamos la forma inicial del estado (deberías completarla)
const initialFormState: PatientRegisterPayload = {
  username: '',
  email: '',
  password: '',
  name: [], // Inicialmente vacío o con datos dummy
  identifier: [],
  telecom: [],
  gender: 'unknown',
  birthDate: '',
  address: [],
  active: true,
};

export const useRegisterForm = () => {
  //const { setUser, setIsAuthenticated } = useAuth(); // Para actualizar el estado global
  const [formData, setFormData] = useState<PatientRegisterPayload>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para actualizar cualquier campo del formulario
  const handleChange = useCallback((key: keyof PatientRegisterPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Función principal de envío del formulario
  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    // **AÑADIR LÓGICA DE VALIDACIÓN AQUÍ** (Ej: password, email format)

    try {
      // Llamar al servicio
      const tokens = await registerService.registerPatient(formData);

      // Actualizar el estado global de la aplicación (usando useAuth)
      //setIsAuthenticated(true);
      //setUser(tokens.user_info);

      return true; // Éxito
    } catch (err: any) {
      console.error('Fallo de registro:', err.message);
      setError(err.message || 'Error desconocido durante el registro.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    formData,
    //,setIsAuthenticated, setUser
  ]);

  return {
    formData,
    isLoading,
    error,
    handleChange,
    handleSubmit,
  };
};
