// carecore-frontend/components/cards/ClinicalRecordCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FHIRResourceIcon } from '../common/FHIRResourceIcon'; // Usaremos el siguiente componente
import { FHIR_RESOURCE_TYPES } from '@carecore/shared';

// Tipos básicos, idealmente importados de una librería FHIR o de tu API
type FHIRType = (typeof FHIR_RESOURCE_TYPES)[keyof typeof FHIR_RESOURCE_TYPES];

interface ClinicalRecordCardProps {
  resourceType: FHIRType;
  title: string;
  subtitle: string; // Ej: Nombre del médico, Tipo de examen
  date: string;
  onPress: () => void;
}

export const ClinicalRecordCard: React.FC<ClinicalRecordCardProps> = (props) => {
  const { resourceType, title, subtitle, date, onPress } = props;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconWrapper}>
        <FHIRResourceIcon type={resourceType} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>

      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{date}</Text>
        {/* Aquí se puede añadir un ícono de flecha (>) para indicar que es clickeable */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dateContainer: {
    marginLeft: 10,
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#00796B', // Color de acento
  },
});
