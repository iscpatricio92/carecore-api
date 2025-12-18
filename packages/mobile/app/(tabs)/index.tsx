// carecore-frontend/app/(tabs)/index.tsx (DashboardScreen)

/* This screen is the home screen of the app, it shows the consent status, the clinical records and the patient's information */
import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { ConsentStatusCard } from '../../components/cards/ConsentStatusCard';
import { ClinicalRecordCard } from '../../components/cards/ClinicalRecordCard';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  DocumentReference,
  FhirResourceType,
  ErrorType,
  EncounterListItemDto,
} from '@carecore/shared';
import { useFHIRData } from '../../hooks/useFHIRData';
import { useEncounters } from '../../hooks/useEncounters';
import { router } from 'expo-router';

export default function DashboardScreen() {
  // Obtener últimos 5 Encounters (usando endpoint optimizado)
  const {
    data: encounters,
    isLoading: isLoadingEncounters,
    error: errorEncounters,
    refetch: refetchEncounters,
  } = useEncounters({
    enablePagination: false,
    pageSize: 5,
  });

  // Obtener últimos 5 DocumentReferences
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    error: errorDocuments,
    refetch: refetchDocuments,
  } = useFHIRData<DocumentReference>('DocumentReference', {
    _count: '5',
    _sort: '-date',
  });

  // Obtener consentimientos activos
  const {
    data: consents,
    isLoading: isLoadingConsents,
    error: errorConsents,
    refetch: refetchConsents,
  } = useFHIRData('Consent', { status: 'active' });

  const isLoading = isLoadingEncounters || isLoadingDocuments || isLoadingConsents;
  const error = errorEncounters || errorDocuments || errorConsents;

  const handleRefresh = () => {
    refetchEncounters();
    refetchDocuments();
    refetchConsents();
  };

  // Combinar y ordenar registros recientes
  const recentRecords = useMemo(() => {
    const allRecords: Array<
      | { type: 'encounter'; data: EncounterListItemDto }
      | { type: 'document'; data: DocumentReference }
    > = [];

    // Agregar Encounters (convertir a formato compatible)
    if (encounters) {
      encounters.forEach((encounter) => {
        allRecords.push({ type: 'encounter', data: encounter });
      });
    }

    // Agregar DocumentReferences
    if (documents) {
      documents.forEach((doc) => {
        allRecords.push({ type: 'document', data: doc });
      });
    }

    // Ordenar por fecha (más reciente primero)
    return allRecords
      .sort((a, b) => {
        const dateA =
          a.type === 'encounter' ? new Date(a.data.createdAt).toISOString() : a.data.date || '';
        const dateB =
          b.type === 'encounter' ? new Date(b.data.createdAt).toISOString() : b.data.date || '';
        if (!dateA || !dateB) return 0;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 5); // Limitar a 5 más recientes
  }, [encounters, documents]);

  return (
    <View style={styles.container}>
      <AppHeader title="CareCore Records" />

      {isLoading && !recentRecords ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonList count={3} itemHeight={80} spacing={12} />
        </ScrollView>
      ) : error ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ErrorMessage
            message={error}
            type={ErrorType.NETWORK}
            onRetry={handleRefresh}
            showRetry={true}
            style={styles.errorMessage}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* TARJETA DE ACCIÓN PRINCIPAL */}
          <ConsentStatusCard
            activeConsentsCount={consents?.length || 0}
            onManagePress={() => {
              router.push('/consents');
            }}
          />

          {/* LISTA DE REGISTROS CLÍNICOS */}
          {recentRecords && recentRecords.length > 0 ? (
            <View style={styles.recordsList}>
              {recentRecords.map((record, index) => {
                if (record.type === 'encounter') {
                  const encounter = record.data;
                  return (
                    <ClinicalRecordCard
                      key={encounter.id || index}
                      resourceType={'Encounter' as FhirResourceType}
                      title={`Encounter - ${encounter.status}`}
                      subtitle={encounter.subjectReference || 'Subject not available'}
                      date={new Date(encounter.createdAt).toISOString()}
                      onPress={() => {
                        if (encounter.encounterId) {
                          router.push(`/record/${encounter.encounterId}`);
                        }
                      }}
                    />
                  );
                } else {
                  const doc = record.data;
                  return (
                    <ClinicalRecordCard
                      key={doc.id || index}
                      resourceType={doc.resourceType as FhirResourceType}
                      title={doc.type?.coding?.[0]?.display || doc.description || 'Document'}
                      subtitle={doc.subject?.display || 'Subject not available'}
                      date={doc.date || 'Date not available'}
                      onPress={() => {
                        if (doc.id) {
                          router.push(`/record/${doc.id}`);
                        }
                      }}
                    />
                  );
                }
              })}
            </View>
          ) : (
            <EmptyState
              title="No hay registros recientes"
              message="Aún no tienes registros clínicos en tu historial"
              iconName="document-outline"
            />
          )}
        </ScrollView>
      )}
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
  recordsList: {
    marginTop: 20,
  },
  errorMessage: {
    margin: 16,
  },
});
