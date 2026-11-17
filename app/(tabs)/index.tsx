import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark, COLORS, RouteLine, SectionHeading, Tag } from "@/components/tarhal-ui";
import { VehicleVisual } from "@/components/vehicle-visual";
import { VEHICLES } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(VEHICLES[0].id);
  const selected = VEHICLES.find((vehicle) => vehicle.id === selectedId) ?? VEHICLES[0];
  const account = trpc.auth.me.useQuery(undefined, { retry: false });

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>ترحال</Text>
            <Text style={styles.brandCaption}>مشوارك يبدأ من هنا</Text>
          </View>
          <BrandMark size={46} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <View style={styles.heroTag}>
              <MaterialCommunityIcons name="map-marker-path" size={15} color={COLORS.petrol} />
              <Text style={styles.heroTagText}>اختيار يناسب رحلتك</Text>
            </View>
            <Text style={styles.heroTitle}>وين نوصلك{"\n"}اليوم؟</Text>
            <Text style={styles.heroDescription}>اختر المركبة المناسبة، ورتّب تفاصيل مشوارك بخطوات بسيطة.</Text>
          </View>
          <View style={styles.heroRoute}>
            <View style={styles.heroRouteDot} />
            <View style={styles.heroRouteDash} />
            <MaterialCommunityIcons name="navigation-variant" size={23} color={COLORS.amber} />
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" onPress={() => router.push(account.data ? "/account" : "/auth")} style={styles.quickAction}>
            <MaterialCommunityIcons name="account-circle-outline" size={19} color={COLORS.petrol} />
            <Text style={styles.quickActionText}>{account.data ? "حسابي" : "تسجيل الدخول"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/trips")} style={styles.quickAction}>
            <MaterialCommunityIcons name="format-list-bulleted" size={19} color={COLORS.petrol} />
            <Text style={styles.quickActionText}>رحلاتي</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/driver/apply")} style={styles.quickAction}>
            <MaterialCommunityIcons name="steering" size={19} color={COLORS.petrol} />
            <Text style={styles.quickActionText}>وضع السائق</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/legal/privacy")} style={styles.quickAction}>
            <MaterialCommunityIcons name="shield-lock-outline" size={19} color={COLORS.petrol} />
            <Text style={styles.quickActionText}>الخصوصية</Text>
          </Pressable>
          {account.data?.role === "admin" ? (
            <Pressable accessibilityRole="button" onPress={() => router.push("/admin/drivers")} style={styles.quickAction}>
              <MaterialCommunityIcons name="account-check-outline" size={19} color={COLORS.petrol} />
              <Text style={styles.quickActionText}>اعتماد السائقين</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeading title="اختر نوع المركبة" subtitle="حدد الفئة الأقرب لاحتياجك" />
          <View style={styles.categoryList}>
            {VEHICLES.map((vehicle) => {
              const isSelected = selectedId === vehicle.id;
              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => setSelectedId(vehicle.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={vehicle.icon as never}
                    size={18}
                    color={isSelected ? COLORS.white : COLORS.petrol}
                  />
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{vehicle.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleCardTop}>
            <View style={styles.vehicleText}>
              <Text style={styles.vehicleName}>{selected.title}</Text>
              <Text style={styles.vehicleDescription}>{selected.description}</Text>
            </View>
            <Tag>
              <Text style={styles.capacityTag}>{selected.seats} ركاب</Text>
            </Tag>
          </View>
          <VehicleVisual vehicle={selected} size="card" />
          <View style={styles.vehicleCardBottom}>
            <View style={styles.suitableRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={17} color={COLORS.petrol} />
              <Text style={styles.suitableText}>{selected.suitableFor}</Text>
            </View>
            <RouteLine compact />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/vehicle/[id]", params: { id: selected.id } })}
              style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
            >
              <Text style={styles.detailsButtonText}>عرض التفاصيل</Text>
              <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.petrol} />
            </Pressable>
          </View>
        </View>

        <View style={styles.footerNote}>
          <MaterialCommunityIcons name="compass-outline" size={17} color={COLORS.muted} />
          <Text style={styles.footerText}>أنشئ رحلة وتابع السيارة بعد قبول السائق.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, gap: 22 },
  topBar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  brandCopy: { alignItems: "flex-end", gap: 2 },
  brandName: { color: COLORS.ink, fontSize: 21, fontWeight: "900", writingDirection: "rtl" },
  brandCaption: { color: COLORS.muted, fontSize: 12, writingDirection: "rtl" },
  heroCard: {
    minHeight: 190,
    backgroundColor: COLORS.petrolDark,
    borderRadius: 28,
    padding: 20,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroCopy: { flex: 1, alignItems: "flex-end", gap: 10, zIndex: 1 },
  heroTag: { flexDirection: "row-reverse", alignItems: "center", gap: 5, backgroundColor: "#E4F1EB", borderRadius: 40, paddingHorizontal: 10, paddingVertical: 6 },
  heroTagText: { color: COLORS.petrolDark, fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
  heroTitle: { color: COLORS.white, fontSize: 27, lineHeight: 35, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  heroDescription: { color: "#D7E8E2", maxWidth: 225, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  heroRoute: { position: "absolute", left: 16, bottom: 19, flexDirection: "row", alignItems: "center", gap: 5, opacity: 0.9 },
  heroRouteDot: { width: 10, height: 10, borderRadius: 8, backgroundColor: COLORS.white },
  heroRouteDash: { width: 30, borderTopWidth: 1.5, borderColor: "#C8DED6", borderStyle: "dashed" },
  quickActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  quickAction: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  quickActionText: { color: COLORS.ink, fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  sectionBlock: { gap: 14 },
  categoryList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, paddingVertical: 2 },
  categoryChip: { flexDirection: "row-reverse", alignItems: "center", gap: 7, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, paddingHorizontal: 13, paddingVertical: 11 },
  categoryChipSelected: { backgroundColor: COLORS.petrol, borderColor: COLORS.petrol },
  categoryText: { color: COLORS.ink, fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  categoryTextSelected: { color: COLORS.white },
  vehicleCard: { backgroundColor: COLORS.card, borderRadius: 25, borderWidth: 1, borderColor: COLORS.line, padding: 13, gap: 13, shadowColor: "#2D4E47", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  vehicleCardTop: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingHorizontal: 3, paddingTop: 3 },
  vehicleText: { alignItems: "flex-end", flex: 1, gap: 4 },
  vehicleName: { color: COLORS.ink, fontSize: 17, fontWeight: "800", writingDirection: "rtl" },
  vehicleDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
  capacityTag: { color: COLORS.petrol, fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  vehicleCardBottom: { gap: 10, paddingHorizontal: 4, paddingBottom: 3 },
  suitableRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  suitableText: { color: COLORS.ink, fontSize: 12, writingDirection: "rtl" },
  detailsButton: { minHeight: 45, borderRadius: 14, borderWidth: 1, borderColor: COLORS.petrol, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  detailsButtonText: { color: COLORS.petrol, fontSize: 13, fontWeight: "800", writingDirection: "rtl" },
  footerNote: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingTop: 1 },
  footerText: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
