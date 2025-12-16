// carecore-frontend/app/(tabs)/index.tsx (DashboardScreen)

/* This screen is the home screen of the app, it shows the consent status, the clinical records and the patient's information */
import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { ConsentStatusCard } from '../../components/cards/ConsentStatusCard';
import { ClinicalRecordCard } from '../../components/cards/ClinicalRecordCard';
import { DocumentReference, Encounter, FhirResourceType } from '@carecore/shared';
import { useFHIRData } from '../../hooks/useFHIRData';
import { router } from 'expo-router';

export default function DashboardScreen() {
  // Obtener últimos 5 Encounters
  const { data: encounters } = useFHIRData<Encounter>('Encounter', {
    _count: '5',
    _sort: '-date',
  });

  // Obtener últimos 5 DocumentReferences
  const { data: documents } = useFHIRData<DocumentReference>('DocumentReference', {
    _count: '5',
    _sort: '-date',
  });

  // Obtener consentimientos activos
  const { data: consents } = useFHIRData('Consent', { status: 'active' });

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
      {/* 2. HEADER: Se integra aquí en cada pantalla si no usas Stack.Screen options */}
      <AppHeader title="CareCore Records" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 3. TARJETA DE ACCIÓN PRINCIPAL */}
        <ConsentStatusCard
          activeConsentsCount={consents?.length || 0}
          onManagePress={() => {
            /* Navegar a la pantalla de consentimientos */
            // TODO: Implementar navegación cuando se cree la pantalla de consentimientos
          }}
        />

        {/* 4. LISTA DE REGISTROS CLÍNICOS */}
        <View style={styles.recordsList}>
          {recentRecords?.map((record, index) => {
            const title =
              record.resourceType === 'Encounter'
                ? record.type?.[0]?.coding?.[0]?.display || record.subject?.display || 'Encounter'
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
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
