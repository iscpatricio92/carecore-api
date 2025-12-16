// carecore-frontend/components/ui/AppHeader.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// Usaremos iconos (ej. de Expo o react-native-vector-icons)
import { Ionicons } from '@expo/vector-icons';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Columna Izquierda: Botón de Regreso (si aplica) */}
      <View style={styles.leftContent}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#00796B" /> {/* Verde aguamarina */}
          </TouchableOpacity>
        )}
      </View>

      {/* Columna Central: Título */}
      <Text style={styles.title}>{title}</Text>

      {/* Columna Derecha: Insignia de Seguridad (CRÍTICO) */}
      <View style={styles.rightContent}>
        {/* Aquí podrías mostrar el estado de MFA o un ícono de candado */}
        <Ionicons name="lock-closed" size={20} color="#00796B" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 40, // Espacio para la barra de estado
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  leftContent: { width: 40 },
  rightContent: { width: 40, alignItems: 'flex-end' },
  backButton: { padding: 8 },
});
