import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonLoaderProps {
  /** Ancho del skeleton (por defecto '100%') */
  width?: number | string;
  /** Alto del skeleton (por defecto 20) */
  height?: number;
  /** Radio de borde (por defecto 4) */
  borderRadius?: number;
  /** Estilo personalizado */
  style?: object;
}

/**
 * Componente Skeleton para mostrar estados de carga
 * Usa animación de shimmer para mejor UX
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonListProps {
  /** Número de items a mostrar */
  count?: number;
  /** Alto de cada item (por defecto 80) */
  itemHeight?: number;
  /** Espaciado entre items (por defecto 12) */
  spacing?: number;
}

/**
 * Componente para mostrar una lista de skeletons
 * Útil para listas de cards o items
 */
export function SkeletonList({ count = 5, itemHeight = 80, spacing = 12 }: SkeletonListProps) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.listItem, { marginBottom: spacing, minHeight: itemHeight }]}
        >
          <SkeletonLoader width={60} height={60} borderRadius={8} />
          <View style={styles.listItemContent}>
            <SkeletonLoader width="80%" height={16} borderRadius={4} style={styles.title} />
            <SkeletonLoader width="60%" height={14} borderRadius={4} style={styles.subtitle} />
            <SkeletonLoader width="40%" height={12} borderRadius={4} style={styles.date} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  listContainer: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 6,
  },
  date: {
    marginTop: 4,
  },
});
