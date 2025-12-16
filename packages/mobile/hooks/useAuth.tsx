/**
 * useAuth Hook - Authentication context and provider
 *
 * Implements OAuth2 Authorization Code flow with PKCE for mobile apps
 * Uses expo-auth-session to handle the OAuth2 flow with Keycloak
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useAuthRequest, ResponseType, useAutoDiscovery } from 'expo-auth-session';
import { router } from 'expo-router';
import { authService } from '../services/AuthService';
import { appConfig } from '../config/AppConfig';
import { ErrorService } from '../services/ErrorService';
import { User } from '@carecore/shared';

// ====================================================================
// 1. DEFINICIÓN DEL CONTEXTO Y TIPOS
// ====================================================================

interface AuthState {
  user: User | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// ====================================================================
// 2. EL HOOK useAuth
// ====================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// ====================================================================
// 3. EL AuthProvider
// ====================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-discovery de Keycloak (obtiene endpoints automáticamente)
  const discovery = useAutoDiscovery(appConfig.keycloak.issuer);

  // Configuración de OAuth2 con PKCE
  const requestConfig = useMemo(
    () => ({
      clientId: appConfig.keycloak.clientId,
      responseType: ResponseType.Code,
      scopes: appConfig.keycloak.scopes,
      redirectUri: appConfig.keycloak.redirectUri,
      usePKCE: true, // PKCE es obligatorio para aplicaciones móviles
    }),
    [],
  );

  // Hook de expo-auth-session para manejar el flujo OAuth2
  const [request, response, promptAsync] = useAuthRequest(requestConfig, discovery);

  // ====================================================================
  // 4. LÓGICA DE ALMACENAMIENTO SEGURO
  // ====================================================================

  const getToken = useCallback(async (): Promise<string | null> => {
    return authService.getAccessToken();
  }, []);

  // ====================================================================
  // 5. ACCIONES DE AUTENTICACIÓN
  // ====================================================================

  const login = useCallback(async () => {
    if (!request) {
      ErrorService.handleAuthError(new Error('Auth request not ready'), { operation: 'login' });
      return;
    }

    try {
      // Inicia el flujo de autenticación (abre el navegador/Keycloak)
      await promptAsync();
    } catch (error) {
      ErrorService.handleAuthError(error, { operation: 'login' });
    }
  }, [request, promptAsync]);

  const logout = useCallback(async () => {
    try {
      // 1. Limpiar el estado local
      setUser(undefined);
      setIsAuthenticated(false);

      // 2. Eliminar tokens del almacenamiento seguro
      await authService.removeTokens();

      // 3. Redirigir al login
      router.replace('/login');
    } catch (error) {
      ErrorService.handleAuthError(error, { operation: 'logout' });
    }
  }, []);

  // ====================================================================
  // 6. MANEJO DE LA RESPUESTA DE KEYCLOAK
  // ====================================================================

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      const codeVerifier = request?.codeVerifier;

      if (!code || !codeVerifier) {
        ErrorService.handleAuthError(new Error('Missing authorization code or code verifier'), {
          operation: 'handleAuthResponse',
        });
        return;
      }

      // Intercambiar código por tokens usando el servicio
      const exchangeTokens = async () => {
        setIsLoading(true);
        try {
          // Intercambiar código por tokens (PKCE - directamente con Keycloak)
          const tokens = await authService.exchangeCodeForTokens(
            code,
            codeVerifier,
            appConfig.keycloak.redirectUri,
          );

          // Obtener información del usuario desde el API
          const userInfo = await fetchUserInfo(tokens.access_token);

          setUser(userInfo);
          setIsAuthenticated(true);

          // Redirigir al dashboard
          router.replace('/(tabs)');
        } catch (error) {
          ErrorService.handleAuthError(error, { operation: 'exchangeTokens' });
          await authService.removeTokens();
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      };

      exchangeTokens();
    }

    if (response?.type === 'error') {
      setIsLoading(false);
      const errorMessage = response.error?.message || 'Authentication failed';
      ErrorService.handleAuthError(new Error(errorMessage), {
        operation: 'handleAuthResponse',
        errorCode: response.error?.code,
      });
    }
  }, [response, request]);

  // ====================================================================
  // 7. CARGAR SESIÓN AL INICIAR LA APP
  // ====================================================================

  const hasLoadedSessionRef = useRef(false);

  useEffect(() => {
    const loadStoredSession = async () => {
      if (hasLoadedSessionRef.current) return;
      hasLoadedSessionRef.current = true;

      try {
        const accessToken = await authService.getAccessToken();

        if (accessToken) {
          // Verificar si el token es válido obteniendo información del usuario
          try {
            const userInfo = await fetchUserInfo(accessToken);
            setUser(userInfo);
            setIsAuthenticated(true);
          } catch {
            // Token inválido o expirado, intentar refrescar
            const refreshed = await authService.refreshAccessToken();
            if (refreshed) {
              const newToken = await authService.getAccessToken();
              if (newToken) {
                const userInfo = await fetchUserInfo(newToken);
                setUser(userInfo);
                setIsAuthenticated(true);
              }
            } else {
              // No se pudo refrescar, limpiar sesión
              await authService.removeTokens();
              setUser(undefined);
              setIsAuthenticated(false);
            }
          }
        } else {
          setUser(undefined);
          setIsAuthenticated(false);
        }
      } catch (error) {
        ErrorService.handleAuthError(error, { operation: 'loadStoredSession' });
        setUser(undefined);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredSession();
  }, []);

  // ====================================================================
  // 8. FUNCIÓN AUXILIAR PARA OBTENER INFORMACIÓN DEL USUARIO
  // ====================================================================

  const fetchUserInfo = async (_accessToken: string): Promise<User> => {
    try {
      // Usar HttpClient para obtener información del usuario
      // HttpClient maneja automáticamente el token y refresh
      // Nota: accessToken se recibe pero no se usa directamente porque httpClient
      // obtiene el token automáticamente desde authService
      const { httpClient } = await import('../services/HttpClient');
      const userData = await httpClient.get<User>(`${appConfig.api.authUrl}/user`);
      return userData;
    } catch (error) {
      ErrorService.handleNetworkError(error, { operation: 'fetchUserInfo' });
      throw error;
    }
  };

  // ====================================================================
  // 9. PROVEEDOR DEL CONTEXTO
  // ====================================================================

  const authState = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      getToken,
    }),
    [user, isAuthenticated, isLoading, login, logout, getToken],
  );

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};
