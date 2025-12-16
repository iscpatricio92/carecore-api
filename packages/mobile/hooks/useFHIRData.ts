// carecore-frontend/hooks/useFHIRData.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { fhirClientService } from '../services/FHIRClientService';
import { Resource } from '@carecore/shared';
import { useAuth } from './useAuth';

interface FetchState<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  hasMore: boolean; // Para paginación
  loadMore: () => void; // Para cargar más datos
}

// Cache simple en memoria (por tipo de recurso y parámetros)
const cache = new Map<string, { data: Resource[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Hook para obtener y gestionar el estado de los recursos FHIR del paciente autenticado.
 *
 * Nota: El backend filtra automáticamente por el paciente autenticado usando el token JWT.
 * No es necesario pasar patientId.
 *
 * @param resourceType El tipo de recurso FHIR (ej: 'Encounter', 'DocumentReference', 'Consent').
 * @param params Parámetros de búsqueda opcionales (ej: { _count: '10', _sort: '-date' }).
 * @param options Opciones adicionales (enableCache, enablePagination).
 */
export function useFHIRData<T extends Resource>(
  resourceType: string,
  params: Record<string, string> = {},
  options: {
    enableCache?: boolean;
    enablePagination?: boolean;
    pageSize?: number;
  } = {},
): FetchState<T> {
  const { isAuthenticated } = useAuth();
  const { enableCache = true, enablePagination = false, pageSize = 20 } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTriggerRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generar clave de cache
  const cacheKey = `${resourceType}:${JSON.stringify(params)}`;

  // Verificar cache
  const getCachedData = useCallback((): T[] | null => {
    if (!enableCache) return null;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T[];
    }

    return null;
  }, [cacheKey, enableCache]);

  // Guardar en cache
  const setCachedData = useCallback(
    (newData: T[]) => {
      if (enableCache) {
        cache.set(cacheKey, { data: newData, timestamp: Date.now() });
      }
    },
    [cacheKey, enableCache],
  );

  // Invalidar cache
  const invalidateCache = useCallback(() => {
    if (enableCache) {
      cache.delete(cacheKey);
    }
  }, [cacheKey, enableCache]);

  const fetchData = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!isAuthenticated) {
        setError('Usuario no autenticado');
        return;
      }

      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        // Construir parámetros de búsqueda
        const searchParams: Record<string, string> = {
          ...params,
        };

        if (enablePagination) {
          searchParams._count = String(pageSize);
          searchParams._page = String(page);
        }

        // Verificar cache solo en la primera página
        if (page === 1 && !append) {
          const cached = getCachedData();
          if (cached) {
            setData(cached);
            setIsLoading(false);
            return;
          }
        }

        const resources = await fhirClientService.getResources<T>(resourceType, searchParams);

        if (append && data) {
          // Agregar a los datos existentes (paginación)
          setData([...data, ...resources]);
        } else {
          // Reemplazar datos
          setData(resources);
          setCachedData(resources);
        }

        // Verificar si hay más datos (si la respuesta tiene menos que pageSize, no hay más)
        if (enablePagination) {
          setHasMore(resources.length === pageSize);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        // No mostrar error si fue cancelado
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : `Error al cargar ${resourceType}`;
        setError(errorMessage);
        console.error(`Error al cargar ${resourceType}:`, err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      resourceType,
      params,
      isAuthenticated,
      enablePagination,
      pageSize,
      data,
      getCachedData,
      setCachedData,
    ],
  );

  // Refetch (invalidar cache y recargar)
  const refetch = useCallback(() => {
    invalidateCache();
    fetchTriggerRef.current += 1;
    setCurrentPage(1);
    setData(null);
    fetchData(1, false);
  }, [fetchData, invalidateCache]);

  // Load more (paginación)
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchData(nextPage, true);
    }
  }, [isLoading, hasMore, currentPage, fetchData]);

  // Efecto principal: cargar datos cuando cambian los parámetros
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage(1);
      setData(null);
      fetchData(1, false);
    }

    // Cleanup: cancelar request si el componente se desmonta
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [resourceType, JSON.stringify(params), isAuthenticated, fetchTriggerRef.current]);

  return {
    data,
    isLoading,
    error,
    refetch,
    hasMore: enablePagination ? hasMore : false,
    loadMore: enablePagination ? loadMore : () => {},
  };
}
