import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { PrimaryButton } from '../components/ui/PrimaryButton';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Página no encontrada</Text>
        <Text style={styles.message}>La ruta que intentas abrir no existe o fue movida.</Text>

        <PrimaryButton
          title="Volver al inicio"
          onPress={() => router.replace('/login')}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  code: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#004D40',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#004D40',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    width: '100%',
  },
});
