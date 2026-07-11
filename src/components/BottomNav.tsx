import { Ionicons } from "@expo/vector-icons";
import { Href, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const COLORS = {
  bg: "#EEEEEE",
  navBg: "#FFFFFF",
  textDark: "#222831",
  textSecondary: "#393E46",
  accent: "#00ADB5",
};

type IoniconName = keyof typeof Ionicons.glyphMap;

const tabs: { name: string; href: Href; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: "Home", href: "/" as Href, icon: "home-outline", iconActive: "home" },
  { name: "Laporan", href: "/laporan" as Href, icon: "document-text-outline", iconActive: "document-text" },
  { name: "Kasus", href: "/kasus" as Href, icon: "settings-outline", iconActive: "settings" },
  { name: "Setting", href: "/setting" as Href, icon: "settings-outline", iconActive: "settings" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.wrapper}>
      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Pressable
              key={tab.name}
              style={styles.navItem}
              onPress={() => router.replace(tab.href)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={22}
                  color={isActive ? COLORS.accent : COLORS.textSecondary}
                />
              </View>
              <Text style={isActive ? styles.navTextActive : styles.navText}>
                {tab.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.bg,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: COLORS.navBg,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 42,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: "rgba(0, 173, 181, 0.12)",
  },
  navText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  navTextActive: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: "700",
  },
});