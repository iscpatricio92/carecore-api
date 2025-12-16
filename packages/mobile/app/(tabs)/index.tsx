// carecore-frontend/app/index.tsx (Tu DashboardScreen)

/* This screen is the home screen of the app, it shows the consent status, the clinical records and the patient's information */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
// 1. Importa tus componentes de las carpetas que creaste:
import { AppHeader } from '../../components/ui/AppHeader';
import { ConsentStatusCard } from '../../components/cards/ConsentStatusCard';
import { ClinicalRecordCard } from '../../components/cards/ClinicalRecordCard';
import { DocumentReference, Encounter, FhirResourceType } from '@carecore/shared';
//import { useFHIRData } from '../../hooks/useFHIRData';
import { router } from 'expo-router';
// import { useAuth } from '../hooks/useAuth'; // Para obtener datos del usuario

export default function DashboardScreen() {
  // const { user } = useAuth(); // Ejemplo de uso del hook

  // 1. LLAMADA REAL A LA API: Obtener los últimos 5 encuentros y documentos
  /*   const { data: recentRecords, isLoading: isLoadingRecords } = useFHIRData<
    Encounter | DocumentReference
  >(
    'Resource', // Usamos un tipo genérico si tu API devuelve varios en una sola ruta
    {
      _count: '5',
      _sort: '-date', // Asumimos que puedes ordenar por fecha descendente
    },
  ); */

  // Datos dummy para el MVP:
  const recentRecords: Array<Encounter | DocumentReference> = [
    {
      resourceType: 'Encounter',
      id: 'encounter-1',
      status: 'finished',
      class: {
        code: 'AMB',
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        display: 'ambulatory',
      },
      type: [{ coding: [{ code: 'GENERAL', display: 'General' }] }],
      subject: { reference: 'Patient/123', display: 'Consulta con Dra. Pérez' },
      period: { start: new Date(Date.now() - 86400000).toISOString() },
    },
    {
      resourceType: 'DocumentReference',
      id: 'doc-1',
      status: 'current',
      type: { coding: [{ code: 'LAB', display: 'Reporte de Laboratorio' }] },
      subject: { reference: 'Patient/123', display: 'Examen de sangre' },
      date: new Date(Date.now() - 259200000).toISOString(),
      content: [{ attachment: { contentType: 'application/pdf' } }],
    },
  ];

  return (
    <View style={styles.container}>
      {/* 2. HEADER: Se integra aquí en cada pantalla si no usas Stack.Screen options */}
      <AppHeader title="CareCore Records" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 3. TARJETA DE ACCIÓN PRINCIPAL */}
        <ConsentStatusCard
          activeConsentsCount={3}
          onManagePress={() => {
            /* Navegar a la pantalla de consentimientos */
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
    backgroundColor: '#F5F5F5', // Fondo suave
  },
  scrollContent: {
    padding: 15,
  },
  recordsList: {
    marginTop: 20,
  },
});
