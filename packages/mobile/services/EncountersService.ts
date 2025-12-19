// carecore-frontend/services/EncountersService.ts

import { httpClient } from './HttpClient';
import { appConfig } from '../config/AppConfig';
import { ErrorService } from './ErrorService';
import { ErrorType, EncounterDetailDto, EncountersListResponse } from '@carecore/shared';

/**
 * Service for optimized encounters endpoint
 * Uses /api/encounters instead of /api/fhir/Encounter
 */
export class EncountersService {
  /**
   * Gets all encounters (optimized for mobile/web)
   */
  async getAll(params?: { page?: string; limit?: string }): Promise<EncountersListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page);
    if (params?.limit) queryParams.set('limit', params.limit);

    const url = `${appConfig.api.baseUrl}/api/encounters${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    try {
      const response = await httpClient.get<EncountersListResponse>(url);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.logError(ErrorType.NETWORK, error.message, error, {
          context: 'EncountersService.getAll',
        });
      }
      throw error;
    }
  }

  /**
   * Gets an encounter by ID (database UUID or encounterId)
   */
  async getById(id: string): Promise<EncounterDetailDto> {
    const url = `${appConfig.api.baseUrl}/api/encounters/${id}`;

    try {
      const response = await httpClient.get<EncounterDetailDto>(url);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        ErrorService.logError(ErrorType.NETWORK, error.message, error, {
          context: 'EncountersService.getById',
          resourceId: id,
        });
      }
      throw error;
    }
  }
}

// Exportar una instancia para usar como Singleton
export const encountersService = new EncountersService();
