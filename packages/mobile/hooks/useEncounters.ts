// carecore-frontend/hooks/useEncounters.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { encountersService } from '../services/EncountersService';
import type { EncounterListItemDto, EncounterDetailDto } from '@carecore/shared';
import { useAuth } from './useAuth';

interface FetchState<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  hasMore: boolean;
  loadMore: () => void;
  total: number;
}

// Cache simple en memoria
const cache = new Map<string, { data: EncounterListItemDto[]; total: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Hook para obtener encounters usando el endpoint optimizado /api/encounters
 */
export function useEncounters(
  options: {
    enableCache?: boolean;
    enablePagination?: boolean;
    pageSize?: number;
  } = {},
): FetchState<EncounterListItemDto> {
  const { isAuthenticated } = useAuth();
  const { enableCache = true, enablePagination = false, pageSize = 20 } = options;

  const [data, setData] = useState<EncounterListItemDto[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTriggerRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generar clave de cache
  const cacheKey = `encounters:page:${currentPage}:limit:${pageSize}`;

  // Verificar cache
  const getCachedData = useCallback((): { data: EncounterListItemDto[]; total: number } | null => {
    if (!enableCache) return null;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { data: cached.data, total: cached.total };
    }

    return null;
  }, [cacheKey, enableCache]);

  // Guardar en cache
  const setCachedData = useCallback(
    (newData: EncounterListItemDto[], totalCount: number) => {
      if (enableCache) {
        cache.set(cacheKey, { data: newData, total: totalCount, timestamp: Date.now() });
      }
    },
    [cacheKey, enableCache],
  );

  // Invalidar cache
  const invalidateCache = useCallback(() => {
    if (enableCache) {
      cache.clear(); // Limpiar todo el cache de encounters
    }
  }, [enableCache]);

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
        // Verificar cache solo en la primera página
        if (page === 1 && !append) {
          const cached = getCachedData();
          if (cached) {
            setData(cached.data);
            setTotal(cached.total);
            setIsLoading(false);
            return;
          }
        }

        const limit = enablePagination ? pageSize : undefined;
        const response = await encountersService.getAll({
          page: String(page),
          limit: limit ? String(limit) : undefined,
        });

        if (append && data) {
          // Agregar a los datos existentes (paginación)
          setData([...data, ...response.data]);
        } else {
          // Reemplazar datos
          setData(response.data);
          setCachedData(response.data, response.total);
        }

        setTotal(response.total);

        // Verificar si hay más datos
        if (enablePagination) {
          const totalLoaded =
            append && data ? data.length + response.data.length : response.data.length;
          setHasMore(totalLoaded < response.total);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        // No mostrar error si fue cancelado
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Error al cargar encounters';
        setError(errorMessage);
        console.error('Error al cargar encounters:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, enablePagination, pageSize, data, getCachedData, setCachedData],
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
  }, [isAuthenticated, fetchTriggerRef.current]);

  return {
    data,
    isLoading,
    error,
    refetch,
    hasMore: enablePagination ? hasMore : false,
    loadMore: enablePagination ? loadMore : () => {},
    total,
  };
}

/**
 * Hook para obtener un encounter específico por ID
 */
export function useEncounter(id: string | null) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<EncounterDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    encountersService
      .getById(id)
      .then(setData)
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar encounter';
        setError(errorMessage);
        console.error('Error al cargar encounter:', err);
      })
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  return { data, isLoading, error };
}
