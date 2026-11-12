import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader, Tag } from "@/components/tarhal-ui";
import { VehicleVisual } from "@/components/vehicle-visual";
import { getVehicle, isVehicleId } from "@/data/vehicles";

export default function VehicleDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const vehicle = getVehicle(id);
  const router = useRouter();

  if (!isVehicleId(id)) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={styles.page}>
          <ScreenHeader title="تفاصيل المركبة" eyebrow="اختيارك، بطريقتك" onBack={() => router.replace("/")} />
          <View style={styles.invalidState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color={COLORS.error} />
            <Text style={styles.invalidText}>تعذر العثور على فئة المركبة المطلوبة.</Text>
            <PrimaryButton title="العودة لاختيار المركبة" onPress={() => router.replace("/")} icon="home" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <ScreenHeader title="تفاصيل المركبة" eyebrow="اختيارك، بطريقتك" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <VehicleVisual vehicle={vehicle} size="hero" />
          <View style={styles.titleBlock}>
            <Tag>
              <Text style={styles.tagText}>{vehicle.name}</Text>
            </Tag>
            <Text style={styles.title}>{vehicle.title}</Text>
            <Text style={styles.description}>{vehicle.description}</Text>
          </View>

          <View style={styles.capacityCard}>
            <View style={styles.capacityIcon}>
              <MaterialCommunityIcons name="account-multiple-outline" size={23} color={COLORS.petrol} />
            </View>
            <View style={styles.capacityCopy}>
              <Text style={styles.cardEyebrow}>السعة التقريبية</Text>
              <Text style={styles.capacityText}>حتى {vehicle.seats} ركاب</Text>
            </View>
            <MaterialCommunityIcons name="seat-passenger" size={26} color={COLORS.amber} />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>مناسبة لـ</Text>
            <View style={styles.useRow}>
              <View style={styles.useIcon}>
                <MaterialCommunityIcons name="map-marker-check-outline" size={19} color={COLORS.petrol} />
              </View>
              <Text style={styles.useText}>{vehicle.suitableFor}</Text>
            </View>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.infoTitle}>مزايا أساسية</Text>
            <View style={styles.featuresList}>
              {vehicle.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.petrol} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton title="متابعة الرحلة" onPress={() => router.push({ pathname: "/trip/request", params: { vehicleId: vehicle.id } })} icon="arrow-back" />
          <Text style={styles.footerCaption}>أدخل وجهتك في الخطوة التالية</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  invalidState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
  invalidText: { color: COLORS.ink, fontSize: 15, fontWeight: "700", textAlign: "center", writingDirection: "rtl" },
  scrollContent: { paddingBottom: 16, gap: 18 },
  titleBlock: { paddingHorizontal: 24, alignItems: "flex-end", gap: 7 },
  tagText: { color: COLORS.petrol, fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  title: { color: COLORS.ink, fontSize: 24, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  description: { color: COLORS.muted, fontSize: 13, lineHeight: 21, textAlign: "right", writingDirection: "rtl" },
  capacityCard: { marginHorizontal: 22, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 15, flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  capacityIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.paleGreen, alignItems: "center", justifyContent: "center" },
  capacityCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  cardEyebrow: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  capacityText: { color: COLORS.ink, fontSize: 16, fontWeight: "800", writingDirection: "rtl" },
  infoCard: { marginHorizontal: 22, padding: 16, gap: 12, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line },
  infoTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  useRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  useIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.paleGreen, alignItems: "center", justifyContent: "center" },
  useText: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: "600", textAlign: "right", writingDirection: "rtl" },
  featuresSection: { marginHorizontal: 22, padding: 16, gap: 12, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line },
  featuresList: { gap: 11 },
  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  featureText: { color: COLORS.ink, fontSize: 13, writingDirection: "rtl" },
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.cream },
  footerCaption: { textAlign: "center", color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
});
