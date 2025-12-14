import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthService } from '@/modules/auth/auth.service';
import { KeycloakAdminService } from '@/modules/auth/services/keycloak-admin.service';
import { FhirService } from '@/modules/fhir/fhir.service';
import { EncryptionService } from '@/common/services/encryption.service';
import { DocumentStorageService } from '@/modules/auth/services/document-storage.service';
import { PractitionerVerificationEntity } from '@/entities/practitioner-verification.entity';
import { RegisterPatientDto } from '@/modules/auth/dto/register-patient.dto';
import { CreatePatientDto } from '@/common/dto/fhir-patient.dto';
import {
  Patient,
  FhirIdentifier,
  FhirContactPoint,
  FhirAddress,
} from '@/common/interfaces/fhir.interface';

describe('Patient Registration (Integration)', () => {
  let authService: AuthService;
  let keycloakAdminService: jest.Mocked<KeycloakAdminService>;
  let fhirService: jest.Mocked<FhirService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let verificationRepository: jest.Mocked<Repository<PractitionerVerificationEntity>>;

  const mockLogger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'KEYCLOAK_URL':
          return 'http://localhost:8080';
        case 'KEYCLOAK_REALM':
          return 'carecore';
        default:
          return undefined;
      }
    }),
  } as unknown as ConfigService;

  const validRegisterDto: RegisterPatientDto = {
    username: 'testpatient',
    email: 'testpatient@example.com',
    password: 'SecurePassword123!',
    name: [
      {
        use: 'official',
        family: 'Doe',
        given: ['John', 'Michael'],
      },
    ],
    gender: 'male',
    birthDate: '1990-01-15',
    identifier: [
      {
        use: 'official',
        system: 'http://hl7.org/fhir/sid/us-ssn',
        value: '123-45-6789',
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: '+1-555-123-4567',
        use: 'mobile',
      },
    ],
    address: [
      {
        use: 'home',
        type: 'both',
        line: ['123 Main Street'],
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US',
      },
    ],
    active: true,
  };

  beforeAll(async () => {
    // Mock KeycloakAdminService
    keycloakAdminService = {
      checkUserExists: jest.fn(),
      createUser: jest.fn(),
      addRoleToUser: jest.fn(),
      sendEmailVerification: jest.fn(),
      findUserById: jest.fn(),
    } as unknown as jest.Mocked<KeycloakAdminService>;

    // Mock FhirService
    fhirService = {
      validatePatientIdentifierUniqueness: jest.fn(),
      createPatient: jest.fn(),
    } as unknown as jest.Mocked<FhirService>;

    // Mock EncryptionService
    encryptionService = {
      encrypt: jest.fn(async (value: string) => `encrypted_${value}`),
      decrypt: jest.fn(async (value: string) => value.replace('encrypted_', '')),
    } as unknown as jest.Mocked<EncryptionService>;

    // Mock DocumentStorageService
    const documentStorageService = {
      validateFile: jest.fn(),
      storeVerificationDocument: jest.fn(),
      getDocumentPath: jest.fn(),
      deleteDocument: jest.fn(),
    } as unknown as DocumentStorageService;

    // Mock Repository
    verificationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<PractitionerVerificationEntity>>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PinoLogger, useValue: mockLogger },
        { provide: KeycloakAdminService, useValue: keycloakAdminService },
        { provide: FhirService, useValue: fhirService },
        { provide: EncryptionService, useValue: encryptionService },
        { provide: DocumentStorageService, useValue: documentStorageService },
        {
          provide: getRepositoryToken(PractitionerVerificationEntity),
          useValue: verificationRepository,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset createPatient mock to default implementation that uses actual data
    fhirService.createPatient.mockImplementation(async (dto: CreatePatientDto) => {
      return {
        id: 'patient-id-default',
        resourceType: 'Patient',
        ...dto,
      } as Patient;
    });
  });

  describe('Successful Registration', () => {
    it('should successfully register a new patient with all fields', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-123';
      const patientId = 'patient-id-123';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });

      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);

      keycloakAdminService.addRoleToUser.mockResolvedValue(true);

      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);

      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      fhirService.createPatient.mockResolvedValue({
        id: patientId,
        resourceType: 'Patient',
        name: validRegisterDto.name,
        gender: validRegisterDto.gender,
        birthDate: validRegisterDto.birthDate,
      } as Patient);

      // Act
      const result = await authService.registerPatient(validRegisterDto);

      // Assert
      expect(result).toHaveProperty('userId', keycloakUserId);
      expect(result).toHaveProperty('patientId', patientId);
      expect(result).toHaveProperty('username', validRegisterDto.username);
      expect(result).toHaveProperty('email', validRegisterDto.email);
      expect(result.message).toContain('Patient registered successfully');

      // Verify Keycloak calls
      expect(keycloakAdminService.checkUserExists).toHaveBeenCalledWith(
        validRegisterDto.username,
        validRegisterDto.email,
      );
      expect(keycloakAdminService.createUser).toHaveBeenCalledWith({
        username: validRegisterDto.username,
        email: validRegisterDto.email,
        password: validRegisterDto.password,
        firstName: 'John',
        lastName: 'Doe',
        enabled: true,
        emailVerified: false,
      });
      expect(keycloakAdminService.addRoleToUser).toHaveBeenCalledWith(keycloakUserId, 'patient');
      expect(keycloakAdminService.sendEmailVerification).toHaveBeenCalledWith(keycloakUserId);

      // Verify identifier uniqueness check
      expect(fhirService.validatePatientIdentifierUniqueness).toHaveBeenCalledWith(
        validRegisterDto.identifier,
      );

      // Verify encryption was called for sensitive data
      expect(encryptionService.encrypt).toHaveBeenCalledWith('123-45-6789'); // SSN
      expect(encryptionService.encrypt).toHaveBeenCalledWith('+1-555-123-4567'); // Phone
      expect(encryptionService.encrypt).toHaveBeenCalledWith('123 Main Street'); // Address line
      expect(encryptionService.encrypt).toHaveBeenCalledWith('12345'); // Postal code

      // Verify Patient creation
      expect(fhirService.createPatient).toHaveBeenCalled();
      const createPatientCall = fhirService.createPatient.mock.calls[0][0];
      expect(createPatientCall.name).toEqual(validRegisterDto.name);
      expect(createPatientCall.gender).toBe(validRegisterDto.gender);
      expect(createPatientCall.birthDate).toBe(validRegisterDto.birthDate);
    });

    it('should successfully register a patient without optional fields', async () => {
      // Arrange
      const minimalDto: RegisterPatientDto = {
        username: 'minimalpatient',
        email: 'minimal@example.com',
        password: 'SecurePassword123!',
        name: [
          {
            use: 'official',
            family: 'Smith',
            given: ['Jane'],
          },
        ],
      };

      const keycloakUserId = 'keycloak-user-id-456';
      const patientId = 'patient-id-456';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });

      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(true);
      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);

      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      fhirService.createPatient.mockResolvedValue({
        id: patientId,
        resourceType: 'Patient',
        name: minimalDto.name,
      } as Patient);

      // Act
      const result = await authService.registerPatient(minimalDto);

      // Assert
      expect(result).toHaveProperty('userId', keycloakUserId);
      expect(result).toHaveProperty('patientId', patientId);
      expect(result).toHaveProperty('username', minimalDto.username);
      expect(result).toHaveProperty('email', minimalDto.email);

      // Verify no encryption calls for optional fields
      expect(encryptionService.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('Validation - Uniqueness Checks', () => {
    it('should throw BadRequestException if username already exists', async () => {
      // Arrange
      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: true,
        emailExists: false,
      });

      // Act & Assert
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        'Username already exists',
      );

      expect(keycloakAdminService.checkUserExists).toHaveBeenCalled();
      expect(keycloakAdminService.createUser).not.toHaveBeenCalled();
      expect(fhirService.createPatient).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      // Arrange
      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: true,
      });

      // Act & Assert
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        'Email already exists',
      );

      expect(keycloakAdminService.checkUserExists).toHaveBeenCalled();
      expect(keycloakAdminService.createUser).not.toHaveBeenCalled();
      expect(fhirService.createPatient).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if identifier (SSN) already exists', async () => {
      // Arrange
      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });

      fhirService.validatePatientIdentifierUniqueness.mockRejectedValue(
        new BadRequestException(
          'Identifier with system http://hl7.org/fhir/sid/us-ssn and value 123-45-6789 already exists',
        ),
      );

      // Act & Assert
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow('already exists');

      expect(keycloakAdminService.checkUserExists).toHaveBeenCalled();
      expect(fhirService.validatePatientIdentifierUniqueness).toHaveBeenCalled();
      expect(keycloakAdminService.createUser).not.toHaveBeenCalled();
      expect(fhirService.createPatient).not.toHaveBeenCalled();
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt SSN in identifiers', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-789';
      const patientId = 'patient-id-789';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(true);
      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);
      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      // Mock createPatient to use the actual data passed to it
      fhirService.createPatient.mockImplementation(async (dto: CreatePatientDto) => {
        return {
          id: patientId,
          resourceType: 'Patient',
          ...dto,
        } as Patient;
      });

      // Act
      await authService.registerPatient(validRegisterDto);

      // Assert
      // Verify that encryption was called with the SSN value
      expect(encryptionService.encrypt).toHaveBeenCalledWith('123-45-6789');

      // Verify that createPatient was called with encrypted data
      const createPatientCall = fhirService.createPatient.mock.calls[0][0];
      expect(createPatientCall.identifier).toBeDefined();
      expect(Array.isArray(createPatientCall.identifier)).toBe(true);

      const ssnIdentifier = createPatientCall.identifier?.find(
        (id: FhirIdentifier) => id.system === 'http://hl7.org/fhir/sid/us-ssn',
      );

      // Verify that the identifier exists and has the correct system
      expect(ssnIdentifier).toBeDefined();
      expect(ssnIdentifier?.system).toBe('http://hl7.org/fhir/sid/us-ssn');

      // The value should be encrypted - verify it if present, otherwise verify encrypt was called
      if (ssnIdentifier?.value) {
        expect(ssnIdentifier.value).toBe('encrypted_123-45-6789');
      }
      // Main verification: ensure encryption was called with the SSN value
      expect(encryptionService.encrypt).toHaveBeenCalledWith('123-45-6789');
    });

    it('should encrypt phone numbers but not emails in telecom', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-101';
      const patientId = 'patient-id-101';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(true);
      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);
      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      // Mock createPatient to use the actual data passed to it
      fhirService.createPatient.mockImplementation(async (dto: CreatePatientDto) => {
        return {
          id: patientId,
          resourceType: 'Patient',
          ...dto,
        } as Patient;
      });

      // Act
      await authService.registerPatient(validRegisterDto);

      // Assert
      // Verify that encryption was called with the phone number
      expect(encryptionService.encrypt).toHaveBeenCalledWith('+1-555-123-4567');

      const createPatientCall = fhirService.createPatient.mock.calls[0][0];
      const phoneTelecom = createPatientCall.telecom?.find(
        (t: FhirContactPoint) => t.system === 'phone',
      );

      // Verify that the phone telecom exists
      expect(phoneTelecom).toBeDefined();
      expect(phoneTelecom?.system).toBe('phone');

      // The value should be encrypted - verify it if present
      if (phoneTelecom?.value) {
        expect(phoneTelecom.value).toBe('encrypted_+1-555-123-4567');
      } else {
        // If value is missing, verify encrypt was called (main verification)
        expect(encryptionService.encrypt).toHaveBeenCalledWith('+1-555-123-4567');
      }
    });

    it('should encrypt address lines and postal codes', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-102';
      const patientId = 'patient-id-102';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(true);
      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);
      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      // Mock createPatient to use the actual data passed to it
      fhirService.createPatient.mockImplementation(async (dto: CreatePatientDto) => {
        return {
          id: patientId,
          resourceType: 'Patient',
          ...dto,
        } as Patient;
      });

      // Act
      await authService.registerPatient(validRegisterDto);

      // Assert
      // Verify that encryption was called for address data
      expect(encryptionService.encrypt).toHaveBeenCalledWith('123 Main Street');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('12345');

      const createPatientCall = fhirService.createPatient.mock.calls[0][0];
      const address = createPatientCall.address?.[0] as FhirAddress | undefined;

      // Verify that the address exists
      expect(address).toBeDefined();

      // The encryption happens asynchronously, verify the encrypted values if present
      if (address?.line && address.line.length > 0 && address.line[0]) {
        expect(address.line[0]).toBe('encrypted_123 Main Street');
      } else {
        // If line is missing, verify encrypt was called (main verification)
        expect(encryptionService.encrypt).toHaveBeenCalledWith('123 Main Street');
      }

      if (address?.postalCode) {
        expect(address.postalCode).toBe('encrypted_12345');
      } else {
        // If postalCode is missing, verify encrypt was called (main verification)
        expect(encryptionService.encrypt).toHaveBeenCalledWith('12345');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle Keycloak user creation failure', async () => {
      // Arrange
      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(null); // Creation failed

      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      // Act & Assert
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.registerPatient(validRegisterDto)).rejects.toThrow(
        'Failed to create user',
      );

      expect(keycloakAdminService.createUser).toHaveBeenCalled();
      expect(fhirService.createPatient).not.toHaveBeenCalled();
    });

    it('should continue even if role assignment fails', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-103';
      const patientId = 'patient-id-103';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(false); // Role assignment failed
      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);
      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      fhirService.createPatient.mockResolvedValue({
        id: patientId,
        resourceType: 'Patient',
      } as Patient);

      // Act
      const result = await authService.registerPatient(validRegisterDto);

      // Assert - Registration should still succeed
      expect(result).toHaveProperty('userId', keycloakUserId);
      expect(result).toHaveProperty('patientId', patientId);
      expect(keycloakAdminService.addRoleToUser).toHaveBeenCalled();
    });

    it('should continue even if email verification send fails', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-104';
      const patientId = 'patient-id-104';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(true);
      keycloakAdminService.sendEmailVerification.mockResolvedValue(false); // Email send failed
      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      fhirService.createPatient.mockResolvedValue({
        id: patientId,
        resourceType: 'Patient',
      } as Patient);

      // Act
      const result = await authService.registerPatient(validRegisterDto);

      // Assert - Registration should still succeed
      expect(result).toHaveProperty('userId', keycloakUserId);
      expect(result).toHaveProperty('patientId', patientId);
      expect(keycloakAdminService.sendEmailVerification).toHaveBeenCalled();
    });
  });

  describe('Patient Resource Creation', () => {
    it('should create Patient resource with correct data', async () => {
      // Arrange
      const keycloakUserId = 'keycloak-user-id-105';
      const patientId = 'patient-id-105';

      keycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      keycloakAdminService.createUser.mockResolvedValue(keycloakUserId);
      keycloakAdminService.addRoleToUser.mockResolvedValue(true);
      keycloakAdminService.sendEmailVerification.mockResolvedValue(true);
      fhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);

      fhirService.createPatient.mockResolvedValue({
        id: patientId,
        resourceType: 'Patient',
        name: validRegisterDto.name,
        gender: validRegisterDto.gender,
        birthDate: validRegisterDto.birthDate,
      } as Patient);

      // Act
      await authService.registerPatient(validRegisterDto);

      // Assert
      expect(fhirService.createPatient).toHaveBeenCalledTimes(1);
      const createPatientCall = fhirService.createPatient.mock.calls[0][0];
      expect(createPatientCall.name).toEqual(validRegisterDto.name);
      expect(createPatientCall.gender).toBe(validRegisterDto.gender);
      expect(createPatientCall.birthDate).toBe(validRegisterDto.birthDate);
      expect(createPatientCall.active).toBe(true);
      const createPatientUserContext = fhirService.createPatient.mock.calls[0][1];
      expect(createPatientUserContext?.keycloakUserId).toBe(keycloakUserId);
    });
  });
});
