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
import { DocumentReference, Encounter, FhirResourceType, ErrorType } from '@carecore/shared';
import { useFHIRData } from '../../hooks/useFHIRData';
import { router } from 'expo-router';

export default function DashboardScreen() {
  // Obtener últimos 5 Encounters
  const {
    data: encounters,
    isLoading: isLoadingEncounters,
    error: errorEncounters,
    refetch: refetchEncounters,
  } = useFHIRData<Encounter>('Encounter', {
    _count: '5',
    _sort: '-date',
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
    const allRecords: Array<Encounter | DocumentReference> = [];

    // Agregar Encounters
    if (encounters) {
      allRecords.push(...encounters);
    }

    // Agregar DocumentReferences
    if (documents) {
      allRecords.push(...documents);
    }

    // Ordenar por fecha (más reciente primero)
    return allRecords
      .sort((a, b) => {
        const dateA = a.resourceType === 'Encounter' ? a.period?.start : a.date;
        const dateB = b.resourceType === 'Encounter' ? b.period?.start : b.date;
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
                const title =
                  record.resourceType === 'Encounter'
                    ? record.type?.[0]?.coding?.[0]?.display ||
                      record.subject?.display ||
                      'Encounter'
                    : record.type?.coding?.[0]?.display || record.description || 'Document';
                const subtitle = record.subject?.display || 'Subject not available';
                const date =
                  record.resourceType === 'Encounter'
                    ? record.period?.start || 'Date not available'
                    : record.date || 'Date not available';

                return (
                  <ClinicalRecordCard
                    key={record.id || index}
                    resourceType={record.resourceType as FhirResourceType}
                    title={title}
                    subtitle={subtitle}
                    date={date}
                    onPress={() => {
                      if (record.id) {
                        router.push(`/record/${record.id}`);
                      }
                    }}
                  />
                );
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
