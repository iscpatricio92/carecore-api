// carecore-frontend/services/RegisterService.ts

// Asegúrate de importar la interfaz de registro de tu paquete compartido
import { PatientRegisterPayload, TokensResponse } from '@carecore/shared';
import { authService } from './AuthService'; // Necesario para guardar los tokens después del registro

const REGISTER_API_URL = 'http://localhost:3000/api/auth/register';

export class RegisterService {
  /**
   * Envía los datos complejos del formulario de registro del paciente (que incluye datos FHIR)
   * al endpoint de NestJS para la creación de la cuenta y el recurso Patient.
   * * @param payload Los datos de registro, incluyendo Patient FHIR y credenciales.
   * @returns Los tokens de sesión (access_token, refresh_token) si el registro fue exitoso.
   */
  async registerPatient(payload: PatientRegisterPayload): Promise<TokensResponse> {
    // 1. Llamada a la API de NestJS para registro
    const response = await fetch(REGISTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Intentar obtener un mensaje de error detallado del backend
      const errorData = await response.json();
      const errorMessage = errorData.message || `Error al registrar. Estado: ${response.status}`;
      throw new Error(errorMessage);
    }

    // 2. Si el registro es exitoso, la API debe devolver los tokens de sesión
    const tokens: TokensResponse = await response.json();

    // 3. Guardar los tokens y establecer la sesión
    if (tokens.access_token) {
      await authService.saveTokens(tokens);
      return tokens;
    } else {
      throw new Error('Registro exitoso, pero no se recibieron tokens de sesión.');
    }
  }
}

export const registerService = new RegisterService();
