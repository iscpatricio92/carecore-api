// carecore-frontend/app/(tabs)/history.tsx
/* This screen is the complete clinical history of the patient */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { ClinicalRecordCard } from '../../components/cards/ClinicalRecordCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  DocumentReference,
  Encounter,
  FhirResourceType,
  ResourceFilter,
  DateFilter,
} from '@carecore/shared';
import { useFHIRData } from '../../hooks/useFHIRData';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Construir parámetros de fecha
  const dateParams = useMemo(() => {
    if (dateFilter === 'all') return {};
    const now = new Date();
    let dateFrom: Date;
    switch (dateFilter) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }
    return { date: `ge${dateFrom.toISOString().split('T')[0]}` };
  }, [dateFilter]);

  // Obtener Encounters con paginación
  const {
    data: encounters,
    isLoading: isLoadingEncounters,
    error: errorEncounters,
    refetch: refetchEncounters,
    hasMore: hasMoreEncounters,
    loadMore: loadMoreEncounters,
  } = useFHIRData<Encounter>('Encounter', dateParams as Record<string, string>, {
    enablePagination: true,
    pageSize: 20,
  });

  // Obtener DocumentReferences con paginación
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    error: errorDocuments,
    refetch: refetchDocuments,
    hasMore: hasMoreDocuments,
    loadMore: loadMoreDocuments,
  } = useFHIRData<DocumentReference>('DocumentReference', dateParams as Record<string, string>, {
    enablePagination: true,
    pageSize: 20,
  });

  // Combinar y filtrar registros
  const allRecords = useMemo(() => {
    const records: Array<Encounter | DocumentReference> = [];

    // Agregar según filtro de tipo
    if (resourceFilter === 'all' || resourceFilter === 'Encounter') {
      if (encounters) records.push(...encounters);
    }
    if (resourceFilter === 'all' || resourceFilter === 'DocumentReference') {
      if (documents) records.push(...documents);
    }

    // Ordenar por fecha (más reciente primero)
    records.sort((a, b) => {
      const dateA = a.resourceType === 'Encounter' ? a.period?.start : a.date;
      const dateB = b.resourceType === 'Encounter' ? b.period?.start : b.date;
      if (!dateA || !dateB) return 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return records.filter((record) => {
        const title =
          record.resourceType === 'Encounter'
            ? record.type?.[0]?.coding?.[0]?.display || record.subject?.display || ''
            : record.type?.coding?.[0]?.display || record.description || '';
        const subtitle = record.subject?.display || '';
        return title.toLowerCase().includes(query) || subtitle.toLowerCase().includes(query);
      });
    }

    return records;
  }, [encounters, documents, resourceFilter, searchQuery]);

  const isLoading = isLoadingEncounters || isLoadingDocuments;
  const error = errorEncounters || errorDocuments;

  const handleRefresh = () => {
    refetchEncounters();
    refetchDocuments();
  };

  const handleLoadMore = () => {
    if (resourceFilter === 'all' || resourceFilter === 'Encounter') {
      if (hasMoreEncounters) loadMoreEncounters();
    }
    if (resourceFilter === 'all' || resourceFilter === 'DocumentReference') {
      if (hasMoreDocuments) loadMoreDocuments();
    }
  };

  const handleRecordPress = (record: Encounter | DocumentReference) => {
    if (record.id) {
      router.push(`/record/${record.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Historial Clínico" />

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en registros..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {/* Filtro por tipo de recurso */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tipo:</Text>
          <TouchableOpacity
            style={[styles.filterChip, resourceFilter === 'all' && styles.filterChipActive]}
            onPress={() => setResourceFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                resourceFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, resourceFilter === 'Encounter' && styles.filterChipActive]}
            onPress={() => setResourceFilter('Encounter')}
          >
            <Text
              style={[
                styles.filterChipText,
                resourceFilter === 'Encounter' && styles.filterChipTextActive,
              ]}
            >
              Consultas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              resourceFilter === 'DocumentReference' && styles.filterChipActive,
            ]}
            onPress={() => setResourceFilter('DocumentReference')}
          >
            <Text
              style={[
                styles.filterChipText,
                resourceFilter === 'DocumentReference' && styles.filterChipTextActive,
              ]}
            >
              Documentos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtro por fecha */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Fecha:</Text>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'all' && styles.filterChipActive]}
            onPress={() => setDateFilter('all')}
          >
            <Text
              style={[styles.filterChipText, dateFilter === 'all' && styles.filterChipTextActive]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'week' && styles.filterChipActive]}
            onPress={() => setDateFilter('week')}
          >
            <Text
              style={[styles.filterChipText, dateFilter === 'week' && styles.filterChipTextActive]}
            >
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'month' && styles.filterChipActive]}
            onPress={() => setDateFilter('month')}
          >
            <Text
              style={[styles.filterChipText, dateFilter === 'month' && styles.filterChipTextActive]}
            >
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'year' && styles.filterChipActive]}
            onPress={() => setDateFilter('year')}
          >
            <Text
              style={[styles.filterChipText, dateFilter === 'year' && styles.filterChipTextActive]}
            >
              Año
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Lista de registros */}
      {isLoading && allRecords.length === 0 ? (
        <LoadingSpinner message="Cargando historial clínico..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : allRecords.length === 0 ? (
        <EmptyState
          title="No hay registros"
          message={
            searchQuery
              ? 'No se encontraron registros que coincidan con tu búsqueda'
              : 'Aún no tienes registros clínicos en tu historial'
          }
          iconName="document-outline"
        />
      ) : (
        <FlatList
          data={allRecords}
          keyExtractor={(item, index) => item.id || `record-${index}`}
          renderItem={({ item }) => {
            const title =
              item.resourceType === 'Encounter'
                ? item.type?.[0]?.coding?.[0]?.display || item.subject?.display || 'Encounter'
                : item.type?.coding?.[0]?.display || item.description || 'Document';
            const subtitle = item.subject?.display || 'Subject not available';
            const date =
              item.resourceType === 'Encounter'
                ? item.period?.start || 'Date not available'
                : item.date || 'Date not available';

            return (
              <ClinicalRecordCard
                resourceType={item.resourceType as FhirResourceType}
                title={title}
                subtitle={subtitle}
                date={date}
                onPress={() => handleRecordPress(item)}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && allRecords.length > 0 ? (
              <View style={styles.footerLoader}>
                <LoadingSpinner size="small" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    padding: 4,
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
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
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
  footerLoader: {
    paddingVertical: 20,
  },
});
