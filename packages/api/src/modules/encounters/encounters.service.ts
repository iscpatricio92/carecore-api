import { Injectable } from '@nestjs/common';

import { EncounterDetailDto } from '../../common/dto/encounter.dto';
import { EncountersListResponse, User } from '@carecore/shared';
import { EncountersCoreService } from './encounters-core.service';
import { EncounterToClientMapper } from './mappers/encounter-to-client.mapper';

/**
 * Encounters Service (Application Service - Thin Layer)
 *
 * This service is a thin orchestration layer that:
 * - Calls EncountersCoreService for business logic and data access
 * - Uses EncounterToClientMapper for transformation
 * - Returns optimized DTOs for mobile/web clients
 *
 * All security, validation, and business logic is in EncountersCoreService.
 */
@Injectable()
export class EncountersService {
  constructor(private readonly coreService: EncountersCoreService) {}

  /**
   * Gets all encounters for the current user
   * Filters by patient context if user is a patient (not admin)
   * Returns optimized DTOs for client consumption
   *
   * @param user - Current authenticated user
   * @returns List of encounters optimized for mobile/web
   */
  async findAll(user?: User): Promise<EncountersListResponse> {
    // Use Core Service to get entities (with security filtering)
    const { entities, total } = await this.coreService.findAll(user);

    // Transform Entity → DTO using mapper
    return {
      data: EncounterToClientMapper.toListItemList(entities),
      total,
    };
  }

  /**
   * Gets an encounter by database UUID
   * Validates that user has access to the encounter
   * Returns optimized DTO for client consumption
   *
   * @param id - Database UUID
   * @param user - Current authenticated user
   * @returns EncounterDetailDto
   */
  async findOne(id: string, user?: User): Promise<EncounterDetailDto> {
    // Use Core Service to get entity (with security validation)
    const entity = await this.coreService.findEncounterById(id, user);

    // Transform Entity → DTO using mapper
    return EncounterToClientMapper.toDetailDto(entity);
  }

  /**
   * Gets an encounter by encounterId (FHIR resource ID)
   * Validates that user has access to the encounter
   * Returns optimized DTO for client consumption
   *
   * @param encounterId - FHIR resource ID
   * @param user - Current authenticated user
   * @returns EncounterDetailDto
   */
  async findByEncounterId(encounterId: string, user?: User): Promise<EncounterDetailDto> {
    // Use Core Service to get entity (with security validation)
    const entity = await this.coreService.findEncounterByEncounterId(encounterId, user);

    // Transform Entity → DTO using mapper
    return EncounterToClientMapper.toDetailDto(entity);
  }
}
