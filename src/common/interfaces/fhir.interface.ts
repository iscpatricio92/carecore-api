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

// Patient Resource
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

// Practitioner Resource
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

// Encounter Resource
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
