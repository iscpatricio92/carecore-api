// carecore-frontend/services/FHIRClientService.ts

import { authService } from './AuthService';
import { appConfig } from '../config/AppConfig';
import { ErrorService, ErrorType } from './ErrorService';
import { Patient, Bundle, Resource } from '@carecore/shared';

export class FHIRClientService {
  /**
   * Crea las cabeceras estándar (Authorization, Content-Type) para las llamadas FHIR.
   */
  private async getHeaders(contentType: string = 'application/json'): Promise<HeadersInit> {
    const accessToken = await authService.getAccessToken();

    if (!accessToken) {
      const error = new Error('Acceso no autorizado. No se encontró el token de acceso.');
      ErrorService.handleAuthError(error, { operation: 'getHeaders' });
      throw error;
    }

    return {
      'Content-Type': contentType,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  // ===================================================================
  // A. Operaciones de LECTURA (GET)
  // ===================================================================

  /**
   * Obtiene un Bundle de Recursos FHIR (Ej: Encounter, DocumentReference).
   * @param resourceType El tipo de recurso FHIR a buscar.
   * @param patientId El ID del paciente (el sub del JWT).
   * @param params Parámetros de búsqueda opcionales (ej: _count=10, date=gt2024).
   */
  async getResources<T extends Resource>(
    resourceType: string,
    patientId: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    // Convertir parámetros a URLSearchParams
    const queryParams = new URLSearchParams({
      patient: patientId, // CRÍTICO: Buscar por el paciente actual
      ...params,
    }).toString();

    const url = `${appConfig.api.fhirUrl}/${resourceType}?${queryParams}`;

    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `Error al obtener recursos ${resourceType}: ${response.statusText}`;
        ErrorService.handleFHIRError(new Error(errorMessage), {
          resourceType,
          status: response.status,
        });
        throw new Error(errorMessage);
      }

      const bundle: Bundle<T> = await response.json();

      // Extraer los recursos del Bundle
      return bundle.entry?.map((entry) => entry.resource).filter((r): r is T => !!r) || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        ErrorService.handleNetworkError(error, { resourceType, operation: 'getResources' });
      } else if (error instanceof Error) {
        ErrorService.handleFHIRError(error, { resourceType });
      }
      throw error;
    }
  }

  /**
   * Obtiene los detalles del Patient logueado.
   * @param patientId El ID del recurso Patient (normalmente el sub del JWT).
   */
  async getPatient(patientId: string): Promise<Patient> {
    const resources = await this.getResources<Patient>('Patient', patientId, { _id: patientId });
    if (resources.length === 0) {
      throw new Error(`Recurso Patient con ID ${patientId} no encontrado.`);
    }
    return resources[0];
  }

  // ===================================================================
  // B. Operaciones de ESCRITURA (POST / PUT)
  // ===================================================================

  /**
   * Crea o actualiza un recurso FHIR.
   * @param resource El objeto recurso FHIR completo.
   */
  async saveResource(resource: Resource): Promise<Resource> {
    const isUpdate = !!resource.id;
    const method = isUpdate ? 'PUT' : 'POST';

    const url = isUpdate
      ? `${appConfig.api.fhirUrl}/${resource.resourceType}/${resource.id}`
      : `${appConfig.api.fhirUrl}/${resource.resourceType}`;

    try {
      const headers = await this.getHeaders();

      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(resource),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `Error al ${isUpdate ? 'actualizar' : 'crear'} recurso: ${response.statusText}`;
        ErrorService.handleFHIRError(new Error(errorMessage), {
          resourceType: resource.resourceType,
          operation: isUpdate ? 'update' : 'create',
          status: response.status,
        });
        throw new Error(errorMessage);
      }

      return response.json() as Promise<Resource>;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        ErrorService.handleNetworkError(error, {
          resourceType: resource.resourceType,
          operation: isUpdate ? 'update' : 'create',
        });
      } else if (error instanceof Error) {
        ErrorService.handleFHIRError(error, { resourceType: resource.resourceType });
      }
      throw error;
    }
  }
}

// Exportar una instancia para usar como Singleton
export const fhirClientService = new FHIRClientService();
