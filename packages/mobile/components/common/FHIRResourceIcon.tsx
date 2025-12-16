// carecore-frontend/components/common/FHIRResourceIcon.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FHIR_RESOURCE_TYPES } from '@carecore/shared';

type FHIRType = (typeof FHIR_RESOURCE_TYPES)[keyof typeof FHIR_RESOURCE_TYPES];

interface FHIRResourceIconProps {
  type: FHIRType;
}

// Mapeo simple de tipo FHIR a un ícono visual
const IconMap: Record<FHIRType, { iconName: keyof typeof Ionicons.glyphMap; color: string }> = {
  Encounter: { iconName: 'pulse', color: '#FF7043' }, // Naranja (actividad médica)
  DocumentReference: { iconName: 'document-text', color: '#4CAF50' }, // Verde (documentación)
  Observation: { iconName: 'stats-chart', color: '#90CAF9' }, // Azul claro (datos/gráficos)
  Consent: { iconName: 'finger-print', color: '#00796B' }, // Verde aguamarina (seguridad/control)
  Patient: { iconName: 'person', color: '#777' },
  Practitioner: { iconName: 'person', color: '#777' },
  Condition: { iconName: 'document-text', color: '#4C1250' },
  Medication: { iconName: 'medkit', color: '#90CA09' },
  Procedure: { iconName: 'pulse', color: '#FF3243' },
};

export const FHIRResourceIcon: React.FC<FHIRResourceIconProps> = ({ type }) => {
  const { iconName, color } = IconMap[type] || IconMap.Patient;

  return (
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={iconName} size={20} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
