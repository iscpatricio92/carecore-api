📘 CareCore API — README

CareCore es una plataforma de historial médico digital donde el paciente es el dueño de su información, y solo profesionales médicos verificados pueden agregar o modificar registros clínicos.

Este repositorio contiene la API backend, construida con NestJS, FHIR, y una arquitectura preparada para integraciones clínicas e IA.

⸻

🚀 Objetivo del API
	•	Servir como orquestador central de datos clínicos.
	•	Exponer recursos compatibles con FHIR (Patient, Practitioner, Encounter, DocumentReference, Consent).
	•	Implementar seguridad avanzada, roles, accesos basados en consentimiento (FHIR Consent), y auditoría inmutable.
	•	Preparar endpoints y pipelines para módulos de IA (resumen clínico, extracción semántica, normalización de términos).
	•	Ser la base para futuras integraciones con:
	•	Laboratorios
	•	Consultorios
	•	Especialistas
	•	Aseguradoras
  •	Sistemas clínicos externos (SMART on FHIR)

  📂 Arquitectura del backend
  ```/src
  /modules
    /auth
    /patients
    /practitioners
    /encounters
    /documents
    /consents
    /audit
    /ai          <- módulo IA (placeholder inicial)
  /common
    /guards
    /filters
    /interceptors
    /dto
  /config
/tests
/docker`

	•	NestJS + TypeScript
	•	PostgreSQL (prod) / SQLite (dev opcional)
	•	FHIR JSON como formato base
	•	MinIO / S3 para archivos clínicos (DocumentReference)
	•	OIDC (Keycloak/Auth0) para identidad y roles
	•	Audit logging obligatorio en cada operación clínica
	•	Cifrado de datos sensibles + integración futura con KMS
	•	IA lista para conectarse como microservicio o módulo interno
