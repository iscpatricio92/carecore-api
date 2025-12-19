import { EncounterToFhirMapper } from './encounter-to-fhir.mapper';
import { EncounterEntity } from '../../../entities/encounter.entity';
import { Encounter, FHIR_RESOURCE_TYPES } from '@carecore/shared';

describe('EncounterToFhirMapper', () => {
  describe('toFhir', () => {
    it('should transform EncounterEntity to FHIR Encounter', () => {
      const fhirResource: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'encounter-123',
        status: 'finished',
        subject: {
          reference: 'Patient/patient-123',
        },
      } as Encounter;

      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-123';
      entity.status = 'finished';
      entity.subjectReference = 'Patient/patient-123';
      entity.fhirResource = fhirResource;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const result = EncounterToFhirMapper.toFhir(entity);

      expect(result).toEqual(fhirResource);
      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.ENCOUNTER);
      expect(result.id).toBe('encounter-123');
      expect(result.status).toBe('finished');
    });

    it('should throw error when entity is missing fhirResource', () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-123';
      entity.status = 'finished';
      // fhirResource is missing

      expect(() => EncounterToFhirMapper.toFhir(entity)).toThrow(
        'Encounter entity missing fhirResource',
      );
    });
  });

  describe('toFhirList', () => {
    it('should transform array of EncounterEntity to FHIR Encounter array', () => {
      const fhirResource1: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'encounter-1',
        status: 'finished',
      } as Encounter;

      const fhirResource2: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'encounter-2',
        status: 'in-progress',
      } as Encounter;

      const entity1 = new EncounterEntity();
      entity1.id = 'db-uuid-1';
      entity1.encounterId = 'encounter-1';
      entity1.fhirResource = fhirResource1;

      const entity2 = new EncounterEntity();
      entity2.id = 'db-uuid-2';
      entity2.encounterId = 'encounter-2';
      entity2.fhirResource = fhirResource2;

      const result = EncounterToFhirMapper.toFhirList([entity1, entity2]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(fhirResource1);
      expect(result[1]).toEqual(fhirResource2);
    });

    it('should return empty array when input is empty', () => {
      const result = EncounterToFhirMapper.toFhirList([]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
