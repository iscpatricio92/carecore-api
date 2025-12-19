// carecore-frontend/services/FHIRClientService.ts

import { httpClient } from './HttpClient';
import { appConfig } from '../config/AppConfig';
import { ErrorService } from './ErrorService';
import { Patient, Bundle, Resource } from '@carecore/shared';

export class FHIRClientService {
  // ===================================================================
  // A. Operaciones de LECTURA (GET)
  // ===================================================================

  /**
   * Obtiene un Bundle de Recursos FHIR (Ej: Encounter, DocumentReference).
   *
   * Nota: El backend filtra automáticamente por el paciente autenticado usando el token JWT.
   * No es necesario pasar patientId como parámetro.
   *
   * @param resourceType El tipo de recurso FHIR a buscar (ej: 'Encounter', 'DocumentReference').
   * @param params Parámetros de búsqueda opcionales (ej: _count=10, _sort=-date, date=gt2024-01-01).
   */
  async getResources<T extends Resource>(
    resourceType: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    // Construir URL con parámetros de búsqueda
    const queryParams = new URLSearchParams(params).toString();
    const url = `${appConfig.api.fhirUrl}/${resourceType}${queryParams ? `?${queryParams}` : ''}`;

    try {
      // HttpClient maneja automáticamente:
      // - Agregar token JWT
      // - Refresh automático si expira
      // - Reintentos en caso de error
      const bundle: Bundle<T> = await httpClient.get<Bundle<T>>(url);

      // Extraer los recursos del Bundle
      // El backend ya filtró por paciente, así que todos los recursos son del paciente autenticado
      return bundle.entry?.map((entry) => entry.resource).filter((r): r is T => !!r) || [];
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.handleFHIRError(error, {
          resourceType,
          operation: 'getResources',
        });
      }
      throw error;
    }
  }

  /**
   * Obtiene los detalles del Patient autenticado.
   * El backend devuelve automáticamente el Patient del usuario autenticado.
   */
  async getPatient(): Promise<Patient> {
    try {
      const resources = await this.getResources<Patient>('Patient');
      if (resources.length === 0) {
        throw new Error('Recurso Patient no encontrado para el usuario autenticado.');
      }
      return resources[0];
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.handleFHIRError(error, {
          resourceType: 'Patient',
          operation: 'getPatient',
        });
      }
      throw error;
    }
  }

  // ===================================================================
  // B. Operaciones de ESCRITURA (POST / PUT)
  // ===================================================================

  /**
   * Obtiene un recurso FHIR específico por ID.
   * @param resourceType El tipo de recurso (ej: 'Encounter', 'DocumentReference').
   * @param id El ID del recurso.
   */
  async getResourceById<T extends Resource>(resourceType: string, id: string): Promise<T> {
    const url = `${appConfig.api.fhirUrl}/${resourceType}/${id}`;

    try {
      const resource = await httpClient.get<T>(url);
      return resource;
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.handleFHIRError(error, {
          resourceType,
          operation: 'getResourceById',
          resourceId: id,
        });
      }
      throw error;
    }
  }

  /**
   * Crea o actualiza un recurso FHIR.
   *
   * Nota: Los pacientes solo pueden crear/actualizar recursos Consent.
   * Otros recursos (Encounter, DocumentReference) solo pueden ser creados por practitioners.
   *
   * @param resource El objeto recurso FHIR completo.
   */
  async saveResource(resource: Resource): Promise<Resource> {
    const isUpdate = !!resource.id;
    const url = isUpdate
      ? `${appConfig.api.fhirUrl}/${resource.resourceType}/${resource.id}`
      : `${appConfig.api.fhirUrl}/${resource.resourceType}`;

    try {
      const savedResource = isUpdate
        ? await httpClient.put<Resource>(url, resource)
        : await httpClient.post<Resource>(url, resource);

      return savedResource;
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.handleFHIRError(error, {
          resourceType: resource.resourceType,
          operation: isUpdate ? 'update' : 'create',
        });
      }
      throw error;
    }
  }

  /**
   * Elimina un recurso FHIR (soft delete).
   * @param resourceType El tipo de recurso.
   * @param id El ID del recurso.
   */
  async deleteResource(resourceType: string, id: string): Promise<void> {
    const url = `${appConfig.api.fhirUrl}/${resourceType}/${id}`;

    try {
      await httpClient.delete<void>(url);
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.handleFHIRError(error, {
          resourceType,
          operation: 'delete',
          resourceId: id,
        });
      }
      throw error;
    }
  }
}

// Exportar una instancia para usar como Singleton
export const fhirClientService = new FHIRClientService();
