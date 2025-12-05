import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create FHIR Entities Tables
 *
 * This migration creates tables for storing FHIR resources:
 * - patients: Patient resources
 * - practitioners: Practitioner resources
 * - encounters: Encounter resources
 * - consents: Consent resources
 * - document_references: DocumentReference resources
 *
 * Strategy: Store complete FHIR resource as JSONB for flexibility,
 * with indexed fields for common queries (status, active, references).
 */
export class CreateFhirEntities1764903866601 implements MigrationInterface {
  name = 'CreateFhirEntities1764903866601';

  /**
   * Helper function to check if a table exists
   */
  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ) as exists`,
    );
    return result[0]?.exists === true;
  }

  /**
   * Helper function to check if an index exists
   */
  private async indexExists(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname = '${indexName}'
      ) as exists`,
    );
    return result[0]?.exists === true;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create practitioners table
    const practitionersExists = await this.tableExists(queryRunner, 'practitioners');
    if (!practitionersExists) {
      await queryRunner.query(`
        CREATE TABLE "practitioners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceType" character varying(50) NOT NULL DEFAULT 'Practitioner',
        "fhirResource" jsonb,
        "active" boolean DEFAULT true,
        "practitionerId" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_88941574a3e4fe907d36ee2f8cc" PRIMARY KEY ("id")
      )
      `);
    }

    // Create patients table
    const patientsExists = await this.tableExists(queryRunner, 'patients');
    if (!patientsExists) {
      await queryRunner.query(`
        CREATE TABLE "patients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceType" character varying(50) NOT NULL DEFAULT 'Patient',
        "fhirResource" jsonb,
        "active" boolean DEFAULT true,
        "patientId" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id")
      )
      `);
    }

    // Create encounters table
    const encountersExists = await this.tableExists(queryRunner, 'encounters');
    if (!encountersExists) {
      await queryRunner.query(`
        CREATE TABLE "encounters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceType" character varying(50) NOT NULL DEFAULT 'Encounter',
        "fhirResource" jsonb,
        "status" character varying(50),
        "encounterId" character varying(255),
        "subjectReference" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_b2e596be58aabc4ccc8f8458b53" PRIMARY KEY ("id")
      )
      `);
    }

    // Create document_references table
    const documentReferencesExists = await this.tableExists(queryRunner, 'document_references');
    if (!documentReferencesExists) {
      await queryRunner.query(`
        CREATE TABLE "document_references" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceType" character varying(50) NOT NULL DEFAULT 'DocumentReference',
        "fhirResource" jsonb,
        "status" character varying(50),
        "documentReferenceId" character varying(255),
        "subjectReference" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_9e61eb7b11a30ba2d7eaa2508f7" PRIMARY KEY ("id")
      )
      `);
    }

    // Create consents table
    const consentsExists = await this.tableExists(queryRunner, 'consents');
    if (!consentsExists) {
      await queryRunner.query(`
        CREATE TABLE "consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceType" character varying(50) NOT NULL DEFAULT 'Consent',
        "fhirResource" jsonb,
        "status" character varying(50),
        "consentId" character varying(255),
        "patientReference" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_9efc68eb6aba7d638fb6ea034dd" PRIMARY KEY ("id")
      )
      `);
    }

    // Create indexes for common queries (only if they don't exist)

    // Patients indexes
    if (!(await this.indexExists(queryRunner, 'IDX_patients_resourceType'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_patients_resourceType" ON "patients" ("resourceType") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_patients_active'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_patients_active" ON "patients" ("active") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_patients_patientId'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_patients_patientId" ON "patients" ("patientId") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_patients_fhirResource'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_patients_fhirResource" ON "patients" USING GIN ("fhirResource")`,
      );
    }

    // Practitioners indexes
    if (!(await this.indexExists(queryRunner, 'IDX_practitioners_resourceType'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_practitioners_resourceType" ON "practitioners" ("resourceType") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_practitioners_active'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_practitioners_active" ON "practitioners" ("active") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_practitioners_practitionerId'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_practitioners_practitionerId" ON "practitioners" ("practitionerId") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_practitioners_fhirResource'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_practitioners_fhirResource" ON "practitioners" USING GIN ("fhirResource")`,
      );
    }

    // Encounters indexes
    if (!(await this.indexExists(queryRunner, 'IDX_encounters_resourceType'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_encounters_resourceType" ON "encounters" ("resourceType") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_encounters_status'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_encounters_status" ON "encounters" ("status") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_encounters_encounterId'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_encounters_encounterId" ON "encounters" ("encounterId") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_encounters_subjectReference'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_encounters_subjectReference" ON "encounters" ("subjectReference") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_encounters_fhirResource'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_encounters_fhirResource" ON "encounters" USING GIN ("fhirResource")`,
      );
    }

    // DocumentReferences indexes
    if (!(await this.indexExists(queryRunner, 'IDX_document_references_resourceType'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_document_references_resourceType" ON "document_references" ("resourceType") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_document_references_status'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_document_references_status" ON "document_references" ("status") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_document_references_documentReferenceId'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_document_references_documentReferenceId" ON "document_references" ("documentReferenceId") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_document_references_subjectReference'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_document_references_subjectReference" ON "document_references" ("subjectReference") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_document_references_fhirResource'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_document_references_fhirResource" ON "document_references" USING GIN ("fhirResource")`,
      );
    }

    // Consents indexes
    if (!(await this.indexExists(queryRunner, 'IDX_consents_resourceType'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_consents_resourceType" ON "consents" ("resourceType") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_consents_status'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_consents_status" ON "consents" ("status") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_consents_consentId'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_consents_consentId" ON "consents" ("consentId") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_consents_patientReference'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_consents_patientReference" ON "consents" ("patientReference") WHERE "deletedAt" IS NULL`,
      );
    }
    if (!(await this.indexExists(queryRunner, 'IDX_consents_fhirResource'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_consents_fhirResource" ON "consents" USING GIN ("fhirResource")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consents_fhirResource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consents_patientReference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consents_consentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consents_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consents_resourceType"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_references_fhirResource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_references_subjectReference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_references_documentReferenceId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_references_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_document_references_resourceType"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_encounters_fhirResource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_encounters_subjectReference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_encounters_encounterId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_encounters_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_encounters_resourceType"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practitioners_fhirResource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practitioners_practitionerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practitioners_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practitioners_resourceType"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_fhirResource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_patientId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_resourceType"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "consents"`);
    await queryRunner.query(`DROP TABLE "document_references"`);
    await queryRunner.query(`DROP TABLE "encounters"`);
    await queryRunner.query(`DROP TABLE "patients"`);
    await queryRunner.query(`DROP TABLE "practitioners"`);
  }
}
