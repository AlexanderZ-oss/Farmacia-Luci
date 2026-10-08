import { Slot } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function CashierLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Caja — POS</Text>
      </View>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#9a3412', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
