// carecore-frontend/services/FHIRClientService.ts

import { authService } from './AuthService'; // Necesario para obtener el token
// Asumimos que puedes importar tus tipos FHIR del paquete compartido
import { Patient, Bundle, Resource } from '@carecore/shared';

// URL base de tu API NestJS que maneja las rutas FHIR
const FHIR_API_BASE_URL = 'http://localhost:3000/api/fhir';

export class FHIRClientService {
  /**
   * Crea las cabeceras estándar (Authorization, Content-Type) para las llamadas FHIR.
   */
  private async getHeaders(contentType: string = 'application/json'): Promise<HeadersInit> {
    const accessToken = await authService.getAccessToken();

    if (!accessToken) {
      // En un entorno de producción, esto debería disparar un error o una redirección de login
      throw new Error('Acceso no autorizado. No se encontró el token de acceso.');
    }

    return {
      'Content-Type': contentType,
      Authorization: `Bearer ${accessToken}`, // 🔑 CRÍTICO: Token de seguridad
    };
  }

  // ===================================================================
  // A. Operaciones de LECTURA (GET)
  // ===================================================================

  /**
   * Obtiene un Bundle de Recursos FHIR (Ej: Encounter, DocumentReference).
   * @param resourceType El tipo de recurso FHIR a buscar.
   * @param patientId El ID del paciente (el sub del JWT).
   * @param params Parámetros de búsqueda opcionales (ej: _count=10, date=gt2024).
   */
  async getResources<T extends Resource>(
    resourceType: string,
    patientId: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    // Convertir parámetros a URLSearchParams
    const queryParams = new URLSearchParams({
      patient: patientId, // CRÍTICO: Buscar por el paciente actual
      ...params,
    }).toString();

    const url = `${FHIR_API_BASE_URL}/${resourceType}?${queryParams}`;

    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Error al obtener recursos ${resourceType}: ${response.statusText}`);
      }

      const bundle: Bundle<T> = await response.json();

      // Extraer los recursos del Bundle (asumiendo que tu API devuelve un Bundle)
      return bundle.entry?.map((entry) => entry.resource).filter((r): r is T => !!r) || [];
    } catch (error) {
      console.error(`FHIR GET Error en ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene los detalles del Patient logueado.
   * @param patientId El ID del recurso Patient (normalmente el sub del JWT).
   */
  async getPatient(patientId: string): Promise<Patient> {
    const resources = await this.getResources<Patient>('Patient', patientId, { _id: patientId });
    if (resources.length === 0) {
      throw new Error(`Recurso Patient con ID ${patientId} no encontrado.`);
    }
    return resources[0];
  }

  // ===================================================================
  // B. Operaciones de ESCRITURA (POST / PUT)
  // ===================================================================

  /**
   * Crea o actualiza un recurso FHIR.
   * @param resource El objeto recurso FHIR completo.
   */
  async saveResource(resource: Resource): Promise<Resource> {
    const isUpdate = !!resource.id;
    const method = isUpdate ? 'PUT' : 'POST';

    const url = isUpdate
      ? `${FHIR_API_BASE_URL}/${resource.resourceType}/${resource.id}`
      : `${FHIR_API_BASE_URL}/${resource.resourceType}`;

    const headers = await this.getHeaders();

    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      throw new Error(
        `Error al ${isUpdate ? 'actualizar' : 'crear'} recurso: ${response.statusText}`,
      );
    }

    return response.json() as Promise<Resource>; // Retorna el recurso guardado
  }
}

// Exportar una instancia para usar como Singleton
export const fhirClientService = new FHIRClientService();
