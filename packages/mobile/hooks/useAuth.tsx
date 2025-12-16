/* // carecore-frontend/hooks/useAuth.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthRequest, ResponseType } from 'expo-auth-session';
import { authService } from '../services/AuthService';
import { User } from '@carecore/shared';
import { storage } from '../storage/secureStorage';

// ====================================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN (ADAPTAR ESTOS VALORES A TU KEYCLOAK)
// ====================================================================

// Guarda los tokens bajo estas claves en el SecureStore del dispositivo
// Import from shared package when uncommented
// import { AUTH_TOKEN_STORAGE_KEY } from '@carecore/shared';
const TOKEN_KEY = 'carecore_auth_token'; // TODO: Replace with AUTH_TOKEN_STORAGE_KEY when uncommented

// Configuración de tu Keycloak/OIDC (ESTO DEBES REEMPLAZARLO)
const discovery = {
  authorizationEndpoint:
    'https://keycloak.yourdomain.com/realms/carecore/protocol/openid-connect/auth',
  tokenEndpoint: 'https://keycloak.yourdomain.com/realms/carecore/protocol/openid-connect/token',
  revocationEndpoint:
    'https://keycloak.yourdomain.com/realms/carecore/protocol/openid-connect/revoke',
  // Otros endpoints necesarios...
};

const config = {
  issuer: 'https://keycloak.yourdomain.com/realms/carecore',
  clientId: 'carecore-frontend-app', // El ID de cliente que registraste en Keycloak
  redirectUri: 'your.app.scheme://auth', // URI de redirección de tu Expo App
  scopes: ['openid', 'profile', 'email', 'fhirUser'], // Scopes solicitados
  responseType: ResponseType.Code,
};

// ====================================================================
// 2. DEFINICIÓN DEL CONTEXTO Y TIPOS
// ====================================================================

interface AuthState {
  // Información básica del usuario, puede ser un JWT decodificado
  user: User | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  // Opcional: Para obtener el token en cualquier componente
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// ====================================================================
// 3. EL HOOK useAuth
// ====================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// =alum{El AuthProvider encapsula toda la lógica y el estado de la autenticación.}
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hook de Expo para manejar el flujo de autenticación vía navegador
  const [request, response, promptAsync] = useAuthRequest(config, discovery);

  // -------------------------------------------------------------
  // Lógica de Almacenamiento Seguro
  // -------------------------------------------------------------

  const saveToken = useCallback(async (token: string) => {
    await storage.setItem(TOKEN_KEY, token);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    return storage.getItem(TOKEN_KEY);
  }, []);

  const removeToken = useCallback(async () => {
    await storage.removeItem(TOKEN_KEY);
  }, []);

  // -------------------------------------------------------------
  // Acciones de Autenticación
  // -------------------------------------------------------------

  const login = useCallback(() => {
    if (request) {
      // Inicia el flujo de autenticación (abre el navegador/Keycloak)
      promptAsync();
    }
  }, [request, promptAsync]);

  const logout = useCallback(async () => {
    // 1. Limpiar el estado local
    setUser(undefined);
    setIsAuthenticated(false);

    // 2. Eliminar el token seguro
    await authService.removeTokens(); // Llama al servicio para limpiar

    // 3. Opcional: Llamar al endpoint de revocación de Keycloak (logout en el servidor)
    // Esto requiere más lógica, pero es buena práctica para la seguridad.
  }, [removeToken]);

  // -------------------------------------------------------------
  // useEffect para manejar la respuesta del navegador
  // -------------------------------------------------------------
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;

      // 1. Intercambio de Código por Tokens (requiere una llamada POST a tu NestJS/Keycloak)
      // En un proyecto real, DEBERÍAS hacer esta llamada desde tu NestJS API
      // o un servicio seguro, o usar una librería que maneje el PKCE/Code flow
      // de forma segura en el cliente.

      // *** Lógica Placeholder para simular la obtención de tokens ***
      const fetchTokens = async (_authCode: string): Promise<void> => {
        setIsLoading(true);
        try {
          // AQUI: Llamas al tokenEndpoint de Keycloak con el código
          // y el verificador PKCE (gestionado por useAuthRequest)

          // Por simplicidad, asumiremos que recibes un token y un usuario
          const fakeAccessToken = 'tu.access.token.aqui';
          const fakeUser: User = {
            id: 'patient-123',
            keycloakUserId: 'patient-123',
            username: 'john.doe',
            roles: ['patient'],
            name: 'John Doe',
            givenName: 'John',
            familyName: 'Doe',
            scopes: ['patient:read', 'patient:write'],
            patient: 'Patient/123',
            fhirUser: 'Practitioner/456',
          };

          await saveToken(fakeAccessToken);
          setUser(fakeUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error fetching tokens:', error);
          await removeToken();
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTokens(code);
    }

    if (response?.type === 'error') {
      setIsLoading(false);
      console.error('Authentication error:', response.error);
    }
  }, [response, saveToken, removeToken]);

  // -------------------------------------------------------------
  // useEffect para cargar el estado inicial (al abrir la app)
  // -------------------------------------------------------------
  const hasLoadedSessionRef = useRef(false);

  useEffect(() => {
    const loadStoredToken = async () => {
      if (hasLoadedSessionRef.current) return;
      hasLoadedSessionRef.current = true;

      try {
        const storedToken = await getToken();

        if (storedToken) {
          // MOCK de sesión válida
          setUser({
            id: 'patient-123',
            keycloakUserId: 'patient-123',
            username: 'john.doe',
            roles: ['patient'],
            name: 'John Doe',
            givenName: 'John',
            familyName: 'Doe',
            scopes: ['patient:read', 'patient:write'],
            patient: 'Patient/123',
            fhirUser: 'Practitioner/456',
          });
          setIsAuthenticated(true);
        } else {
          setUser(undefined);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error loading stored session:', error);
        setUser(undefined);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredToken();
  }, [getToken]);

  // -------------------------------------------------------------
  // Proveedor del Contexto
  // -------------------------------------------------------------
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
 */
