// carecore-frontend/hooks/useFHIRData.ts

import { useState, useEffect } from 'react';
import { fhirClientService } from '../services/FHIRClientService';
import { Resource } from '@carecore/shared';
import { useAuth } from './useAuth'; // Necesario para obtener el patientId

interface FetchState<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para obtener y gestionar el estado de los recursos FHIR de un paciente.
 * @param resourceType El tipo de recurso FHIR (Ej: 'Encounter').
 * @param params Parámetros de búsqueda opcionales.
 */
export function useFHIRData<T extends Resource>(
  resourceType: string,
  params: Record<string, string> = {},
): FetchState<T> {
  const { user } = useAuth(); // Asumimos que 'user' contiene el ID del paciente (sub)

  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0); // Para forzar un refetch

  const patientId = user?.sub; // Reemplaza 'user.sub' por el campo que uses para el Patient ID

  const fetchData = async () => {
    if (!patientId) {
      setError('No se encontró el ID del paciente.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const resources = await fhirClientService.getResources<T>(resourceType, patientId, params);
      setData(resources);
    } catch (err) {
      console.error(`Error al cargar ${resourceType}:`, err);
      setError(`Fallo al cargar los datos clínicos de ${resourceType}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [resourceType, patientId, fetchTrigger]); // Se ejecuta al cambiar tipo/paciente/refetch

  const refetch = () => setFetchTrigger((prev) => prev + 1);

  return { data, isLoading, error, refetch };
}
