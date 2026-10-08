import { Slot } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function StockerLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Inventario — Reponedor</Text>
      </View>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#166534', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
