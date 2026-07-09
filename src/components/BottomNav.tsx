import { Href, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const tabs = [
  { name: "Home", href: "/" as Href },
  { name: "Laporan", href: "/laporan" as Href },
  { name: "Setting", href: "/setting" as Href },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Pressable key={tab.name} style={styles.navItem} onPress={() => router.replace(tab.href)}>
            <Text style={isActive ? styles.navTextActive : styles.navText}>{tab.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
