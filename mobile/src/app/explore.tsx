import { StyleSheet, Text, View, ScrollView, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Keşfet</Text>
          <Text style={styles.subtitle}>
            OnPace ile neler yapabilirsiniz?
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Notlar</Text>
            <Text style={styles.cardText}>
              Dersleriniz için not alın, flashcard oluşturun ve quiz yapın.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Takvim</Text>
            <Text style={styles.cardText}>
              Görevlerinizi ve sınavlarınızı takvimde takip edin.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🤖 AI Asistan</Text>
            <Text style={styles.cardText}>
              Yapay zeka destekli çalışma asistanınızla sorularınızı yanıtlayın.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 Çalışma Grupları</Text>
            <Text style={styles.cardText}>
              Arkadaşlarınızla birlikte çalışma grupları oluşturun.
            </Text>
          </View>

          <Pressable
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://onpace.netlify.app')}>
            <Text style={styles.linkText}>🌐 Web Uygulamasını Aç</Text>
          </Pressable>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
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
  linkButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
