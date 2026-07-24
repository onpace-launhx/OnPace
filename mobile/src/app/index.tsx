import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.title}>OnPace</Text>
            <Text style={styles.subtitle}>
              Çalışma arkadaşınız, her zaman yanınızda.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📚 Hoş Geldiniz</Text>
            <Text style={styles.cardText}>
              OnPace mobil uygulaması aktif. Web uygulamasıyla aynı verileri
              paylaşıyorsunuz.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏱️ Focus Mode</Text>
            <Text style={styles.cardText}>
              Odaklanma modunu kullanarak dikkat dağıtıcıları engelleyin.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Başarılar</Text>
            <Text style={styles.cardText}>
              Hedeflerinize ulaşın ve rozetler kazanın.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardText: {
    fontSize: 14,
    color: '#AEAEB2',
    lineHeight: 20,
  },
});
