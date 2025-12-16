// carecore-frontend/services/RegisterService.ts

import { PatientRegisterPayload, TokensResponse } from '@carecore/shared';
import { authService } from './AuthService';
import { appConfig } from '../config/AppConfig';
import { ErrorService, ErrorType } from './ErrorService';

export class RegisterService {
  /**
   * Envía los datos complejos del formulario de registro del paciente (que incluye datos FHIR)
   * al endpoint de NestJS para la creación de la cuenta y el recurso Patient.
   * * @param payload Los datos de registro, incluyendo Patient FHIR y credenciales.
   * @returns Los tokens de sesión (access_token, refresh_token) si el registro fue exitoso.
   */
  async registerPatient(payload: PatientRegisterPayload): Promise<TokensResponse> {
    try {
      const response = await fetch(`${appConfig.api.authUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Error al registrar. Estado: ${response.status}`;
        ErrorService.handleAuthError(new Error(errorMessage), {
          status: response.status,
          operation: 'registerPatient',
        });
        throw new Error(errorMessage);
      }

      const tokens: TokensResponse = await response.json();

      if (tokens.access_token) {
        await authService.saveTokens(tokens);
        return tokens;
      } else {
        const error = new Error('Registro exitoso, pero no se recibieron tokens de sesión.');
        ErrorService.handleAuthError(error, { operation: 'registerPatient' });
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        ErrorService.handleNetworkError(error, { operation: 'registerPatient' });
      }
      throw error;
    }
  }
}

export const registerService = new RegisterService();
