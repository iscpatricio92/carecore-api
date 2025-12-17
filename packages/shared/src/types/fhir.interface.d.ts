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
//# sourceMappingURL=fhir.interface.d.ts.map
