import { EncounterToClientMapper } from './encounter-to-client.mapper';
import { EncounterEntity } from '../../../entities/encounter.entity';
import { Encounter, FHIR_RESOURCE_TYPES } from '@carecore/shared';

describe('EncounterToClientMapper', () => {
  let entity: EncounterEntity;

  beforeEach(() => {
    const fhirResource: Encounter = {
      resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
      id: 'encounter-123',
      status: 'finished',
      subject: {
        reference: 'Patient/patient-123',
      },
    } as Encounter;

    entity = new EncounterEntity();
    entity.id = 'db-uuid-123';
    entity.encounterId = 'encounter-123';
    entity.status = 'finished';
    entity.subjectReference = 'Patient/patient-123';
    entity.fhirResource = fhirResource;
    entity.createdAt = new Date('2024-01-01T10:00:00Z');
    entity.updatedAt = new Date('2024-01-02T10:00:00Z');
  });

  describe('toDto', () => {
    it('should transform EncounterEntity to EncounterDto', () => {
      const result = EncounterToClientMapper.toDto(entity);

      expect(result.id).toBe('db-uuid-123');
      expect(result.encounterId).toBe('encounter-123');
      expect(result.status).toBe('finished');
      expect(result.subjectReference).toBe('Patient/patient-123');
      expect(result.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-02T10:00:00Z'));
      expect(result.fhirResource).toEqual(entity.fhirResource);
    });
  });

  describe('toDetailDto', () => {
    it('should transform EncounterEntity to EncounterDetailDto', () => {
      const result = EncounterToClientMapper.toDetailDto(entity);

      expect(result.id).toBe('db-uuid-123');
      expect(result.encounterId).toBe('encounter-123');
      expect(result.status).toBe('finished');
      expect(result.subjectReference).toBe('Patient/patient-123');
      expect(result.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-02T10:00:00Z'));
    });
  });

  describe('toListItem', () => {
    it('should transform EncounterEntity to EncounterListItemDto (optimized for lists)', () => {
      const result = EncounterToClientMapper.toListItem(entity);

      expect(result.id).toBe('db-uuid-123');
      expect(result.encounterId).toBe('encounter-123');
      expect(result.status).toBe('finished');
      expect(result.subjectReference).toBe('Patient/patient-123');
      expect(result.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
      // Should not have updatedAt or fhirResource (optimized for lists)
      expect((result as unknown as { updatedAt?: Date }).updatedAt).toBeUndefined();
      expect((result as unknown as { fhirResource?: unknown }).fhirResource).toBeUndefined();
    });
  });

  describe('toListItemList', () => {
    it('should transform array of EncounterEntity to EncounterListItemDto array', () => {
      const entity2 = new EncounterEntity();
      entity2.id = 'db-uuid-456';
      entity2.encounterId = 'encounter-456';
      entity2.status = 'in-progress';
      entity2.subjectReference = 'Patient/patient-456';
      entity2.createdAt = new Date('2024-01-03T10:00:00Z');
      entity2.updatedAt = new Date('2024-01-04T10:00:00Z');

      const result = EncounterToClientMapper.toListItemList([entity, entity2]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('db-uuid-123');
      expect(result[0].encounterId).toBe('encounter-123');
      expect(result[1].id).toBe('db-uuid-456');
      expect(result[1].encounterId).toBe('encounter-456');
    });

    it('should return empty array when input is empty', () => {
      const result = EncounterToClientMapper.toListItemList([]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('toDtoList', () => {
    it('should transform array of EncounterEntity to EncounterDetailDto array', () => {
      const entity2 = new EncounterEntity();
      entity2.id = 'db-uuid-456';
      entity2.encounterId = 'encounter-456';
      entity2.status = 'in-progress';
      entity2.subjectReference = 'Patient/patient-456';
      entity2.createdAt = new Date('2024-01-03T10:00:00Z');
      entity2.updatedAt = new Date('2024-01-04T10:00:00Z');

      const result = EncounterToClientMapper.toDtoList([entity, entity2]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('db-uuid-123');
      expect(result[1].id).toBe('db-uuid-456');
    });
  });
});
