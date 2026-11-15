import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/components/tarhal-ui";

export type LiveMapLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string | Date;
};

// Expo Metro resolves live-map.native.tsx or live-map.web.tsx at runtime.
export function LiveMap({ location }: { location: LiveMapLocation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>موقع السيارة وصل</Text>
      <Text style={styles.copy}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 260, borderRadius: 24, backgroundColor: "#E8EFE9", alignItems: "center", justifyContent: "center", padding: 20, gap: 8 },
  title: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  copy: { color: COLORS.muted, fontSize: 12 },
});
