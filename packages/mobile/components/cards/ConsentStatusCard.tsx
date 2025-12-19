// carecore-frontend/components/cards/ConsentStatusCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from '../ui/PrimaryButton'; // Asumimos un componente de botón

interface ConsentStatusCardProps {
  activeConsentsCount: number;
  onManagePress: () => void;
}

export const ConsentStatusCard: React.FC<ConsentStatusCardProps> = React.memo(
  ({ activeConsentsCount, onManagePress }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.header}>Tu Información está Protegida</Text>

        {/* Mensaje de estado */}
        <Text style={styles.statusText}>
          Actualmente compartiendo con {activeConsentsCount} profesional(es) médico(s) o
          institución(es).
        </Text>

        {/* Botón de Acción Principal */}
        <PrimaryButton
          title="Administrar Accesos (Consentimientos)"
          onPress={onManagePress}
          style={styles.button}
        />

        {/* Texto de refuerzo de propiedad */}
        <Text style={styles.footerText}>Recuerda: Eres el dueño absoluto de tu historial.</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E0F2F1', // Fondo de acento suave (Verde Aguamarina Claro)
    padding: 20,
    borderRadius: 12,
    marginVertical: 15,
    alignItems: 'center',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004D40', // Verde oscuro para contraste
    marginBottom: 5,
  },
  statusText: {
    fontSize: 15,
    color: '#00796B',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    // Estilo del botón primario (debe ser verde aguamarina fuerte)
    width: '100%',
  },
  footerText: {
    fontSize: 12,
    color: '#777',
    marginTop: 15,
    fontStyle: 'italic',
  },
});
