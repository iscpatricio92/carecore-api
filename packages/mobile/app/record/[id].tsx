// carecore-frontend/app/record/[id].tsx
/* This screen shows the details of a specific clinical record (Encounter or DocumentReference) */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppHeader } from '../../components/ui/AppHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { fhirClientService } from '../../services/FHIRClientService';
import { Encounter, DocumentReference } from '@carecore/shared';
import { Ionicons } from '@expo/vector-icons';

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<Encounter | DocumentReference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState<'Encounter' | 'DocumentReference' | null>(null);

  useEffect(() => {
    const loadRecord = async () => {
      if (!id) {
        setError('ID de registro no proporcionado');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Intentar cargar como Encounter primero
        try {
          const encounter = await fhirClientService.getResourceById<Encounter>('Encounter', id);
          setRecord(encounter);
          setResourceType('Encounter');
        } catch {
          // Si falla, intentar como DocumentReference
          const document = await fhirClientService.getResourceById<DocumentReference>(
            'DocumentReference',
            id,
          );
          setRecord(document);
          setResourceType('DocumentReference');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar el registro';
        setError(errorMessage);
        console.error('Error loading record:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecord();
  }, [id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Detalle del Registro" />
        <LoadingSpinner message="Cargando registro..." />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={styles.container}>
        <AppHeader title="Detalle del Registro" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#D32F2F" />
          <Text style={styles.errorText}>{error || 'Registro no encontrado'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Detalle del Registro" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Información General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información General</Text>
          <View style={styles.infoCard}>
            <InfoRow
              label="Tipo"
              value={resourceType === 'Encounter' ? 'Consulta Médica' : 'Documento Clínico'}
            />
            <InfoRow label="ID" value={record.id || 'No disponible'} />
            {record.status && <InfoRow label="Estado" value={record.status} />}
          </View>
        </View>

        {/* Información Específica según Tipo */}
        {resourceType === 'Encounter' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detalles de la Consulta</Text>
              <View style={styles.infoCard}>
                {(record as Encounter).type?.[0]?.coding?.[0]?.display && (
                  <InfoRow
                    label="Tipo de Consulta"
                    value={(record as Encounter).type[0].coding[0].display}
                  />
                )}
                {(record as Encounter).period?.start && (
                  <InfoRow
                    label="Fecha de Inicio"
                    value={formatDate((record as Encounter).period?.start)}
                  />
                )}
                {(record as Encounter).period?.end && (
                  <InfoRow
                    label="Fecha de Fin"
                    value={formatDate((record as Encounter).period?.end)}
                  />
                )}
                {(record as Encounter).subject?.display && (
                  <InfoRow label="Paciente" value={(record as Encounter).subject.display} />
                )}
                {(record as Encounter).serviceProvider?.display && (
                  <InfoRow
                    label="Proveedor de Servicio"
                    value={(record as Encounter).serviceProvider.display}
                  />
                )}
              </View>
            </View>

            {(record as Encounter).participant && (record as Encounter).participant!.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Participantes</Text>
                <View style={styles.infoCard}>
                  {(record as Encounter).participant!.map((participant, index) => (
                    <InfoRow
                      key={index}
                      label={`Participante ${index + 1}`}
                      value={participant.individual?.display || 'No disponible'}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {resourceType === 'DocumentReference' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detalles del Documento</Text>
              <View style={styles.infoCard}>
                {(record as DocumentReference).type?.coding?.[0]?.display && (
                  <InfoRow
                    label="Tipo de Documento"
                    value={(record as DocumentReference).type.coding[0].display || 'No disponible'}
                  />
                )}
                {(record as DocumentReference).date && (
                  <InfoRow label="Fecha" value={formatDate((record as DocumentReference).date)} />
                )}
                {(record as DocumentReference).description && (
                  <InfoRow label="Descripción" value={(record as DocumentReference).description} />
                )}
                {(record as DocumentReference).subject?.display && (
                  <InfoRow label="Paciente" value={(record as DocumentReference).subject.display} />
                )}
                {(record as DocumentReference).author?.[0]?.display && (
                  <InfoRow label="Autor" value={(record as DocumentReference).author[0].display} />
                )}
              </View>
            </View>

            {(record as DocumentReference).content &&
              (record as DocumentReference).content!.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contenido</Text>
                  <View style={styles.infoCard}>
                    {(record as DocumentReference).content!.map((content, index) => (
                      <View key={index} style={styles.contentItem}>
                        {content.attachment?.url && (
                          <InfoRow label={`Archivo ${index + 1}`} value={content.attachment.url} />
                        )}
                        {content.attachment?.contentType && (
                          <InfoRow
                            label="Tipo de Contenido"
                            value={content.attachment.contentType}
                          />
                        )}
                        {content.attachment?.size && (
                          <InfoRow
                            label="Tamaño"
                            value={`${(content.attachment.size / 1024).toFixed(2)} KB`}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
          </>
        )}

        {/* Botón de Volver */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Componente auxiliar para mostrar información en filas
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  contentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#00796B',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
