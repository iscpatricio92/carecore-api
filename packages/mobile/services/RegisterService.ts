// carecore-frontend/services/RegisterService.ts

import { PatientRegisterPayload, PatientRegisterResponse } from '@carecore/shared';
import { appConfig } from '../config/AppConfig';
import { ErrorService } from './ErrorService';
import { httpClient } from './HttpClient';

export class RegisterService {
  /**
   * Envía los datos complejos del formulario de registro del paciente (que incluye datos FHIR)
   * al endpoint de NestJS para la creación de la cuenta y el recurso Patient.
   *
   * Nota: El endpoint de registro NO devuelve tokens. Después del registro exitoso,
   * el usuario debe hacer login para obtener tokens. Este método solo registra al usuario.
   *
   * @param payload Los datos de registro, incluyendo Patient FHIR y credenciales.
   * @returns La respuesta del registro (userId, patientId, username, email, message).
   */
  async registerPatient(payload: PatientRegisterPayload): Promise<PatientRegisterResponse> {
    try {
      // El registro no requiere autenticación, así que usamos skipAuth
      const response: PatientRegisterResponse = await httpClient.post<PatientRegisterResponse>(
        `${appConfig.api.authUrl}/register`,
        payload,
        { skipAuth: true },
      );

      // El registro fue exitoso, pero NO devuelve tokens
      // El usuario debe hacer login después del registro para obtener tokens
      return response;
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.handleAuthError(error, {
          operation: 'registerPatient',
        });
      }
      throw error;
    }
  }
}

export const registerService = new RegisterService();
