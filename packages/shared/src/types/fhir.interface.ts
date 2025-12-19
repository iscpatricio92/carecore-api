/**
 * Base interfaces for FHIR R4 resources
 * Based on FHIR R4 specification: https://www.hl7.org/fhir/
 */

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  implicitRules?: string;
  language?: string;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FhirCoding[];
  tag?: FhirCoding[];
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  type?: FhirCodeableConcept;
  system?: string;
  value?: string;
  period?: FhirPeriod;
  assigner?: FhirReference;
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FhirPeriod;
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirReference {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueDateTime?: string;
  valueCode?: string;
  valueReference?: FhirReference;
  extension?: FhirExtension[];
}

/**
 * Patient Resource
 * A person receiving or registered to receive healthcare services
 *
 * @description
 * Demographics and other administrative information about a person
 * receiving care or other health-related services.
 *
 * @see https://www.hl7.org/fhir/patient.html
 * @example
 * {
 *   "resourceType": "Patient",
 *   "id": "patient-123",
 *   "identifier": [{
 *     "use": "official",
 *     "system": "http://hl7.org/fhir/sid/us-ssn",
 *     "value": "123-45-6789"
 *   }],
 *   "active": true,
 *   "name": [{
 *     "use": "official",
 *     "family": "Doe",
 *     "given": ["John", "Michael"]
 *   }],
 *   "gender": "male",
 *   "birthDate": "1990-01-15"
 * }
 */
export interface Patient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  photo?: FhirAttachment[];
  contact?: PatientContact[];
  communication?: PatientCommunication[];
  managingOrganization?: FhirReference;
  link?: PatientLink[];
}

export interface PatientContact {
  relationship?: FhirCodeableConcept[];
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FhirReference;
  period?: FhirPeriod;
}

export interface PatientCommunication {
  language: FhirCodeableConcept;
  preferred?: boolean;
}

export interface PatientLink {
  other: FhirReference;
  type: 'replaced-by' | 'replaces' | 'refer' | 'seealso';
}

export interface FhirAttachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

/**
 * Practitioner Resource
 * A person who is directly or indirectly involved in the provisioning of healthcare
 *
 * @description
 * A person who is directly or indirectly involved in the provisioning of healthcare.
 * This includes physicians, nurses, therapists, technicians, etc.
 *
 * @see https://www.hl7.org/fhir/practitioner.html
 * @example
 * {
 *   "resourceType": "Practitioner",
 *   "id": "practitioner-456",
 *   "identifier": [{
 *     "use": "official",
 *     "system": "http://example.com/medical-licenses",
 *     "value": "MD-12345"
 *   }],
 *   "active": true,
 *   "name": [{
 *     "use": "official",
 *     "prefix": ["Dr."],
 *     "family": "Smith",
 *     "given": ["Jane"]
 *   }]
 * }
 */
export interface Practitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  photo?: FhirAttachment[];
  qualification?: PractitionerQualification[];
  communication?: FhirCodeableConcept[];
}

export interface PractitionerQualification {
  identifier?: FhirIdentifier[];
  code: FhirCodeableConcept;
  period?: FhirPeriod;
  issuer?: FhirReference;
}

/**
 * Encounter Resource
 * An interaction between a patient and healthcare provider(s) for the purpose of providing healthcare service(s)
 *
 * @description
 * An interaction between a patient and healthcare provider(s) for the purpose of providing
 * healthcare service(s) or assessing the health status of a patient.
 *
 * @see https://www.hl7.org/fhir/encounter.html
 * @example
 * {
 *   "resourceType": "Encounter",
 *   "id": "encounter-789",
 *   "status": "finished",
 *   "class": {
 *     "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
 *     "code": "AMB",
 *     "display": "ambulatory"
 *   },
 *   "subject": {
 *     "reference": "Patient/123",
 *     "display": "John Doe"
 *   },
 *   "period": {
 *     "start": "2024-01-15T10:00:00Z",
 *     "end": "2024-01-15T10:30:00Z"
 *   }
 * }
 */
export interface Encounter extends FhirResource {
  resourceType: 'Encounter';
  identifier?: FhirIdentifier[];
  status:
    | 'planned'
    | 'arrived'
    | 'triaged'
    | 'in-progress'
    | 'onleave'
    | 'finished'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';
  statusHistory?: EncounterStatusHistory[];
  class: FhirCoding;
  classHistory?: EncounterClassHistory[];
  type?: FhirCodeableConcept[];
  serviceType?: FhirCodeableConcept;
  priority?: FhirCodeableConcept;
  subject?: FhirReference;
  episodeOfCare?: FhirReference[];
  basedOn?: FhirReference[];
  participant?: EncounterParticipant[];
  appointment?: FhirReference[];
  period?: FhirPeriod;
  length?: FhirQuantity;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  diagnosis?: EncounterDiagnosis[];
  account?: FhirReference[];
  hospitalization?: EncounterHospitalization;
  location?: EncounterLocation[];
  serviceProvider?: FhirReference;
  partOf?: FhirReference;
}

export interface EncounterStatusHistory {
  status: Encounter['status'];
  period: FhirPeriod;
}

export interface EncounterClassHistory {
  class: FhirCoding;
  period: FhirPeriod;
}

export interface EncounterParticipant {
  type?: FhirCodeableConcept[];
  period?: FhirPeriod;
  individual?: FhirReference;
}

export interface EncounterDiagnosis {
  condition: FhirReference;
  use?: FhirCodeableConcept;
  rank?: number;
}

export interface EncounterHospitalization {
  preAdmissionIdentifier?: FhirIdentifier;
  origin?: FhirReference;
  admitSource?: FhirCodeableConcept;
  reAdmission?: FhirCodeableConcept;
  dietPreference?: FhirCodeableConcept[];
  specialCourtesy?: FhirCodeableConcept[];
  specialArrangement?: FhirCodeableConcept[];
  destination?: FhirReference;
  dischargeDisposition?: FhirCodeableConcept;
}

export interface EncounterLocation {
  location: FhirReference;
  status?: 'planned' | 'active' | 'reserved' | 'completed';
  physicalType?: FhirCodeableConcept;
  period?: FhirPeriod;
}

/**
 * Consent Resource
 * A record of a healthcare consumer's choices or choices made on their behalf
 *
 * @description
 * A record of a healthcare consumer's choices, which permits or denies identified
 * recipient(s) or recipient role(s) to perform one or more actions within a given
 * policy context, for specific purposes and periods of time.
 *
 * @see https://www.hl7.org/fhir/consent.html
 * @example
 * {
 *   "resourceType": "Consent",
 *   "id": "consent-101",
 *   "status": "active",
 *   "scope": {
 *     "coding": [{
 *       "system": "http://terminology.hl7.org/CodeSystem/consentscope",
 *       "code": "patient-privacy",
 *       "display": "Privacy Consent"
 *     }]
 *   },
 *   "category": [{
 *     "coding": [{
 *       "system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes",
 *       "code": "59284-0",
 *       "display": "Patient Consent"
 *     }]
 *   }],
 *   "patient": {
 *     "reference": "Patient/123"
 *   }
 * }
 */
export interface Consent extends FhirResource {
  resourceType: 'Consent';
  identifier?: FhirIdentifier[];
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
  scope: FhirCodeableConcept;
  category: FhirCodeableConcept[];
  patient?: FhirReference;
  dateTime?: string;
  performer?: FhirReference[];
  organization?: FhirReference[];
  sourceAttachment?: FhirAttachment;
  sourceReference?: FhirReference;
  policy?: ConsentPolicy[];
  policyRule?: FhirCodeableConcept;
  verification?: ConsentVerification[];
  provision?: ConsentProvision;
}

export interface ConsentPolicy {
  authority?: string;
  uri?: string;
}

export interface ConsentVerification {
  verified: boolean;
  verificationType?: FhirCodeableConcept;
  verifiedBy?: FhirReference;
  verifiedWith?: FhirReference;
  verificationDate?: string;
}

export interface ConsentProvision {
  type?: 'deny' | 'permit';
  period?: FhirPeriod;
  actor?: ConsentProvisionActor[];
  action?: FhirCodeableConcept[];
  securityLabel?: FhirCoding[];
  purpose?: FhirCoding[];
  class?: FhirCoding[];
  code?: FhirCodeableConcept[];
  dataPeriod?: FhirPeriod;
  data?: ConsentProvisionData[];
  provision?: ConsentProvision[];
}

export interface ConsentProvisionActor {
  role?: FhirCodeableConcept;
  reference?: FhirReference;
}

export interface ConsentProvisionData {
  meaning: 'instance' | 'related' | 'dependents' | 'authoredby';
  reference: FhirReference;
}

/**
 * DocumentReference Resource
 * A reference to a document
 *
 * @description
 * A reference to a document of any kind for any purpose. Provides metadata about
 * the document so that the document can be discovered and managed. The scope of
 * a document is any seralized object with a mime-type, so includes formal patient
 * centric documents (CDA documents, etc.), clinical notes, scanned paper, and
 * non-patient specific documents like policy documents.
 *
 * @see https://www.hl7.org/fhir/documentreference.html
 * @example
 * {
 *   "resourceType": "DocumentReference",
 *   "id": "doc-202",
 *   "status": "current",
 *   "type": {
 *     "coding": [{
 *       "system": "http://loinc.org",
 *       "code": "34133-9",
 *       "display": "Summary of episode note"
 *     }]
 *   },
 *   "subject": {
 *     "reference": "Patient/123"
 *   },
 *   "content": [{
 *     "attachment": {
 *       "contentType": "application/pdf",
 *       "url": "https://example.com/documents/report.pdf"
 *     }
 *   }]
 * }
 */
export interface DocumentReference extends FhirResource {
  resourceType: 'DocumentReference';
  masterIdentifier?: FhirIdentifier;
  identifier?: FhirIdentifier[];
  status: 'current' | 'superseded' | 'entered-in-error';
  docStatus?: 'preliminary' | 'final' | 'amended' | 'entered-in-error' | 'deprecated';
  type?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  subject?: FhirReference;
  date?: string;
  author?: FhirReference[];
  authenticator?: FhirReference;
  custodian?: FhirReference;
  relatesTo?: DocumentReferenceRelatesTo[];
  description?: string;
  securityLabel?: FhirCoding[];
  content: DocumentReferenceContent[];
  context?: DocumentReferenceContext;
}

export interface DocumentReferenceRelatesTo {
  code: 'replaces' | 'transforms' | 'signs' | 'appends';
  target: FhirReference;
}

export interface DocumentReferenceContent {
  attachment: FhirAttachment;
  format?: FhirCoding;
}

export interface DocumentReferenceContext {
  encounter?: FhirReference[];
  event?: FhirCodeableConcept[];
  period?: FhirPeriod;
  facilityType?: FhirCodeableConcept;
  practiceSetting?: FhirCodeableConcept;
  sourcePatientInfo?: FhirReference;
  related?: FhirReference[];
}

// OperationOutcome Resource
export interface OperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome';
  issue: OperationOutcomeIssue[];
}

export interface OperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  details?: FhirCodeableConcept;
  diagnostics?: string;
  location?: string[];
  expression?: string[];
}

/**
 * Resource Type Alias
 *
 * A type alias for FhirResource that represents any FHIR resource.
 * This is a convenience type for generic operations that work with any resource type.
 *
 * @example
 * function processResource<T extends Resource>(resource: T): T {
 *   // Process any FHIR resource
 *   return resource;
 * }
 */
export type Resource = FhirResource;

/**
 * Union type of all specific FHIR resource types
 *
 * This union type represents all the specific FHIR resource types
 * that are defined in this package. Useful for type narrowing and
 * type-safe operations across different resource types.
 */
export type SpecificResource =
  | Patient
  | Practitioner
  | Encounter
  | Consent
  | DocumentReference
  | OperationOutcome;
