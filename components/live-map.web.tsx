import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/components/tarhal-ui";

export type LiveMapLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string | Date;
};

export function LiveMap({ location }: { location: LiveMapLocation }) {
  const updatedAt = new Date(location.updatedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={styles.container}>
      <View style={styles.marker}><Text style={styles.markerText}>●</Text></View>
      <Text style={styles.title}>الخريطة الحية متاحة داخل تطبيق الهاتف</Text>
      <Text style={styles.copy}>آخر إحداثية وصلت من هاتف السائق عند {updatedAt}. معاينة الويب لا تدعم خريطة GPS الأصلية أو التتبع في الخلفية.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 260, borderRadius: 24, backgroundColor: "#E8EFE9", alignItems: "center", justifyContent: "center", padding: 24, gap: 11 },
  marker: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.petrol, alignItems: "center", justifyContent: "center" },
  markerText: { color: "#FFFFFF", fontSize: 22 },
  title: { color: COLORS.ink, fontSize: 16, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  copy: { color: COLORS.muted, fontSize: 12, lineHeight: 20, textAlign: "center", writingDirection: "rtl" },
});
