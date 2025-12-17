// carecore-frontend/app/(tabs)/settings.tsx
/* This screen is the settings screen of the app, it shows the user's profile and the settings of the app */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { useFHIRData } from '../../hooks/useFHIRData';
import { Patient } from '@carecore/shared';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { user, logout, isLoading: isLoadingAuth } = useAuth();
  const { data: patientData, isLoading: isLoadingPatient } = useFHIRData<Patient>('Patient');
  const { data: consents } = useFHIRData('Consent', { status: 'active' });

  const isLoading = isLoadingAuth || isLoadingPatient;

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleManageConsents = () => {
    router.push('/consents');
  };

  // Obtener información del paciente
  const patient = patientData && patientData.length > 0 ? patientData[0] : null;
  const patientName = patient?.name?.[0]
    ? `${patient.name[0].given?.join(' ') || ''} ${patient.name[0].family || ''}`.trim()
    : user?.email || 'Usuario';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Perfil" />
        <LoadingSpinner message="Cargando información..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Perfil" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Información del Usuario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#00796B" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{patientName}</Text>
              </View>
            </View>

            {user?.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={20} color="#00796B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              </View>
            )}

            {patient?.birthDate && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#00796B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
                  <Text style={styles.infoValue}>
                    {new Date(patient.birthDate).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            )}

            {patient?.gender && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#00796B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Género</Text>
                  <Text style={styles.infoValue}>
                    {patient.gender === 'male'
                      ? 'Masculino'
                      : patient.gender === 'female'
                        ? 'Femenino'
                        : patient.gender === 'other'
                          ? 'Otro'
                          : 'No especificado'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Consentimientos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consentimientos</Text>
          <TouchableOpacity style={styles.actionCard} onPress={handleManageConsents}>
            <View style={styles.actionContent}>
              <Ionicons name="shield-checkmark" size={24} color="#00796B" />
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Administrar Accesos</Text>
                <Text style={styles.actionSubtitle}>
                  {consents?.length || 0} consentimiento(s) activo(s)
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Información de la App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color="#00796B" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Versión de la App</Text>
                <Text style={styles.infoValue}>{Constants.expoConfig?.version || '0.1.0'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#FFF" />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
