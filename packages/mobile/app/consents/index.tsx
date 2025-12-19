// carecore-frontend/app/consents/index.tsx
/* This screen allows the patient to manage their consentimientos (consents) */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFHIRData } from '../../hooks/useFHIRData';
import { fhirClientService } from '../../services/FHIRClientService';
import { Consent, ConsentStatusFilter } from '@carecore/shared';
import { Ionicons } from '@expo/vector-icons';

export default function ConsentsScreen() {
  const [statusFilter, setStatusFilter] = useState<ConsentStatusFilter>('all');
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  // Obtener todos los consentimientos
  const {
    data: allConsents,
    isLoading,
    error,
    refetch,
  } = useFHIRData<Consent>('Consent', {
    _sort: '-date',
  });

  // Filtrar consentimientos por estado
  const filteredConsents = useMemo(() => {
    if (!allConsents) return [];
    if (statusFilter === 'all') return allConsents;

    return allConsents.filter((consent) => {
      if (statusFilter === 'active') return consent.status === 'active';
      if (statusFilter === 'revoked') return consent.status === 'revoked';
      if (statusFilter === 'expired') {
        // Verificar si está expirado (si tiene expirationDate y ya pasó)
        if (consent.provision?.period?.end) {
          return new Date(consent.provision.period.end) < new Date();
        }
        return false;
      }
      return true;
    });
  }, [allConsents, statusFilter]);

  const handleRevoke = React.useCallback(
    async (consent: Consent) => {
      if (!consent.id) {
        Alert.alert('Error', 'No se puede revocar este consentimiento');
        return;
      }

      Alert.alert(
        'Revocar Consentimiento',
        '¿Estás seguro de que deseas revocar este consentimiento?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Revocar',
            style: 'destructive',
            onPress: async () => {
              setIsRevoking(consent.id!);
              try {
                // Actualizar el consentimiento con status 'revoked'
                const updatedConsent: Consent = {
                  ...consent,
                  status: 'revoked',
                };
                await fhirClientService.saveResource(updatedConsent);
                // Recargar la lista
                refetch();
                Alert.alert('Éxito', 'Consentimiento revocado correctamente');
              } catch (err) {
                const errorMessage =
                  err instanceof Error ? err.message : 'Error al revocar el consentimiento';
                Alert.alert('Error', errorMessage);
              } finally {
                setIsRevoking(null);
              }
            },
          },
        ],
      );
    },
    [refetch],
  );

  const formatDate = React.useCallback((dateString?: string) => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }, []);

  const getStatusColor = React.useCallback((status?: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'revoked':
        return '#D32F2F';
      case 'expired':
        return '#FF9800';
      default:
        return '#666';
    }
  }, []);

  const getStatusLabel = React.useCallback((consent: Consent) => {
    if (consent.status === 'revoked') return 'Revocado';
    if (consent.status === 'active') {
      // Verificar si está expirado
      if (consent.provision?.period?.end) {
        if (new Date(consent.provision.period.end) < new Date()) {
          return 'Expirado';
        }
      }
      return 'Activo';
    }
    return consent.status || 'Desconocido';
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Consentimientos" />

      {/* Filtros por estado */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text
              style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'active' && styles.filterChipTextActive,
              ]}
            >
              Activos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'revoked' && styles.filterChipActive]}
            onPress={() => setStatusFilter('revoked')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'revoked' && styles.filterChipTextActive,
              ]}
            >
              Revocados
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'expired' && styles.filterChipActive]}
            onPress={() => setStatusFilter('expired')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'expired' && styles.filterChipTextActive,
              ]}
            >
              Expirados
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Lista de consentimientos */}
      {isLoading && !allConsents ? (
        <LoadingSpinner message="Cargando consentimientos..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : filteredConsents.length === 0 ? (
        <EmptyState
          title="No hay consentimientos"
          message={
            statusFilter === 'all'
              ? 'Aún no has creado ningún consentimiento'
              : `No hay consentimientos ${statusFilter === 'active' ? 'activos' : statusFilter === 'revoked' ? 'revocados' : 'expirados'}`
          }
          iconName="shield-outline"
        />
      ) : (
        <FlatList
          data={filteredConsents}
          keyExtractor={(item) => item.id || `consent-${item.dateTime || Date.now()}`}
          renderItem={({ item: consent }) => {
            const statusLabel = getStatusLabel(consent);
            const statusColor = getStatusColor(
              consent.status === 'active' &&
                consent.provision?.period?.end &&
                new Date(consent.provision.period.end) < new Date()
                ? 'expired'
                : consent.status,
            );

            return (
              <View style={styles.consentCard}>
                <View style={styles.consentHeader}>
                  <View style={styles.consentStatusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  {consent.status === 'active' &&
                    !(
                      consent.provision?.period?.end &&
                      new Date(consent.provision.period.end) < new Date()
                    ) && (
                      <TouchableOpacity
                        onPress={() => handleRevoke(consent)}
                        disabled={isRevoking === consent.id}
                        style={styles.revokeButton}
                      >
                        {isRevoking === consent.id ? (
                          <ActivityIndicator size="small" color="#D32F2F" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={18} color="#D32F2F" />
                            <Text style={styles.revokeButtonText}>Revocar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                </View>

                <View style={styles.consentContent}>
                  {consent.provision?.actor?.[0]?.reference && (
                    <View style={styles.consentInfoRow}>
                      <Ionicons name="person" size={16} color="#666" />
                      <Text style={styles.consentInfoText}>
                        Con: {consent.provision.actor[0].reference}
                      </Text>
                    </View>
                  )}

                  {consent.dateTime && (
                    <View style={styles.consentInfoRow}>
                      <Ionicons name="calendar" size={16} color="#666" />
                      <Text style={styles.consentInfoText}>
                        Fecha: {formatDate(consent.dateTime)}
                      </Text>
                    </View>
                  )}

                  {consent.provision?.period?.start && (
                    <View style={styles.consentInfoRow}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.consentInfoText}>
                        Desde: {formatDate(consent.provision.period.start)}
                      </Text>
                    </View>
                  )}

                  {consent.provision?.period?.end && (
                    <View style={styles.consentInfoRow}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.consentInfoText}>
                        Hasta: {formatDate(consent.provision.period.end)}
                      </Text>
                    </View>
                  )}

                  {consent.provision?.purpose && consent.provision.purpose.length > 0 && (
                    <View style={styles.consentInfoRow}>
                      <Ionicons name="document-text" size={16} color="#666" />
                      <Text style={styles.consentInfoText}>
                        Propósito:{' '}
                        {consent.provision.purpose
                          .map((p) => p.coding?.[0]?.display || p.code)
                          .join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        />
      )}

      {/* Botón para crear nuevo consentimiento (futuro) */}
      {/* TODO: Implementar formulario para crear nuevo consentimiento */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filtersContainer: {
    maxHeight: 60,
    marginBottom: 10,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginRight: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#00796B',
    borderColor: '#00796B',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  consentCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  consentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  revokeButtonText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  consentContent: {
    marginTop: 8,
  },
  consentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  consentInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
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
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#00796B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
