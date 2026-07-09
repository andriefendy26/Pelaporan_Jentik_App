import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from '../services/Context/AuthContext';

export default function MainTabs() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"home" | "laporan" | "setting">("home");
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout()
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === "home" && (
          <View>
            <Text style={styles.title}>Pelaporan Jentik</Text>
            <Text style={styles.subtitle}>Dashboard utama aplikasi</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Selamat datang {user?.name ?? user?.username}!</Text>
              <Text style={styles.cardText}>
                Anda dapat melihat data laporan, dashboard, dan analisa dari sini.
              </Text>
            </View>
            <Pressable style={styles.button} onPress={handleLogout}>
              <Text style={styles.buttonText}>Logout</Text>
            </Pressable>
          </View>
        )}

        {activeTab === "laporan" && (
          <View>
            <Text style={styles.title}>Laporan</Text>
            <Text style={styles.subtitle}>Halaman laporan akan ditampilkan di sini.</Text>
          </View>
        )}

        {activeTab === "setting" && (
          <View>
            <Text style={styles.title}>Setting</Text>
            <Text style={styles.subtitle}>Halaman setting akan ditampilkan di sini.</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => setActiveTab("home")}>
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={activeTab === "home" ? styles.navTextActive : styles.navText}>Home</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => setActiveTab("laporan")}>
          <Text style={styles.navIcon}>▤</Text>
          <Text style={activeTab === "laporan" ? styles.navTextActive : styles.navText}>Laporan</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => setActiveTab("setting")}>
          <Text style={styles.navIcon}>⚙</Text>
          <Text style={activeTab === "setting" ? styles.navTextActive : styles.navText}>Setting</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#0f172a",
  },
  cardText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingBottom: 16,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  navTextActive: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "700",
  },
});
