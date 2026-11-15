import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import { VEHICLES, type VehicleId } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

function DriverApplyContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const status = trpc.driver.applicationStatus.useQuery();
  const [vehicleId, setVehicleId] = useState<VehicleId>(VEHICLES[0].id);
  const [error, setError] = useState("");
  const apply = trpc.driver.submitApplication.useMutation({
    onSuccess: async () => {
      setError("");
      await utils.driver.applicationStatus.invalidate();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  if (status.isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View>;
  const application = status.data;
  const approved = application?.status === "approved";
  const pending = application?.status === "pending";

  return (
    <ScreenContainer>
      <ScreenHeader title="وضع السائق" eyebrow="ترحال" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <MaterialCommunityIcons name="steering" size={32} color={COLORS.petrol} />
          <Text style={styles.title}>{approved ? "حسابك سائق معتمد" : pending ? "طلبك قيد المراجعة" : application?.status === "rejected" ? "لم يُعتمد طلبك" : "قدّم طلب الانضمام كسائق"}</Text>
          <Text style={styles.copy}>يوافق مشرف ترحال على السائقين. اختر فئة المركبة التي ستستقبل طلبات رحلاتها.</Text>
        </View>

        {approved ? (
          <PrimaryButton title="عرض الرحلات المتاحة" onPress={() => router.push("/driver/requests")} icon="format-list-bulleted" />
        ) : pending ? (
          <View style={styles.statusCard}><Text style={styles.statusText}>سيظهر وضع السائق هنا بعد مراجعة المشرف.</Text></View>
        ) : (
          <>
            <Text style={styles.label}>فئة المركبة</Text>
            <View style={styles.categories}>
              {VEHICLES.map((vehicle) => {
                const selected = vehicleId === vehicle.id;
                return (
                  <Pressable key={vehicle.id} onPress={() => setVehicleId(vehicle.id)} style={[styles.category, selected && styles.categorySelected]}>
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{vehicle.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <PrimaryButton title={apply.isPending ? "جارٍ إرسال الطلب…" : "إرسال طلب الاعتماد"} onPress={() => apply.mutate({ vehicleId })} disabled={apply.isPending} icon="send" />
            <Text style={styles.note}>لا تظهر طلبات الركاب لك قبل اعتماد المشرف.</Text>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default function DriverApplyScreen() {
  return <AuthGate title="وضع السائق">{() => <DriverApplyContent />}</AuthGate>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 18 },
  intro: { alignItems: "center", gap: 10, paddingVertical: 18 },
  title: { color: COLORS.ink, fontSize: 20, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  copy: { color: COLORS.muted, fontSize: 13, lineHeight: 21, textAlign: "center", writingDirection: "rtl" },
  label: { color: COLORS.ink, fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  categories: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  category: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  categorySelected: { backgroundColor: COLORS.petrol, borderColor: COLORS.petrol },
  categoryText: { color: COLORS.ink, fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  categoryTextSelected: { color: COLORS.white },
  statusCard: { padding: 17, borderRadius: 18, backgroundColor: COLORS.paleAmber },
  statusText: { color: COLORS.ink, fontSize: 13, fontWeight: "700", textAlign: "center", writingDirection: "rtl" },
  note: { color: COLORS.muted, fontSize: 11, textAlign: "center", writingDirection: "rtl" },
  error: { color: COLORS.error, fontSize: 12, textAlign: "right", writingDirection: "rtl" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
