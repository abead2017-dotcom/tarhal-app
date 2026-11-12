import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, RouteLine, ScreenHeader } from "@/components/tarhal-ui";
import { VehicleVisual } from "@/components/vehicle-visual";
import { getVehicle, isVehicleId } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

export default function TripConfirmScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string | string[]; origin?: string | string[]; destination?: string | string[] }>();
  const getParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const vehicleId = getParam(params.vehicleId);
  const validVehicle = isVehicleId(vehicleId);
  const vehicle = getVehicle(vehicleId);
  const rawOrigin = getParam(params.origin)?.trim() ?? "";
  const rawDestination = getParam(params.destination)?.trim() ?? "";
  const origin = rawOrigin || "—";
  const destination = rawDestination || "—";
  const requestIsValid = validVehicle && rawOrigin.length > 0 && rawOrigin.length <= 255 && rawDestination.length > 0 && rawDestination.length <= 255;
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const submitRequest = trpc.tripRequest.submit.useMutation({
    onSuccess: () => setConfirmed(true),
    onError: (mutationError) => setError(mutationError.message),
  });

  const confirmDemoRequest = () => {
    if (!isVehicleId(vehicleId) || !rawOrigin || rawOrigin.length > 255 || !rawDestination || rawDestination.length > 255) {
      setError("بيانات الرحلة غير مكتملة. ارجع لإكمال اختيار المركبة ونقطتي الرحلة.");
      return;
    }
    setError("");
    submitRequest.mutate({ vehicleId, origin: rawOrigin, destination: rawDestination });
  };

  const visibleError = error || (!requestIsValid && !confirmed ? "بيانات الطلب غير مكتملة؛ لا يمكن حفظه قبل تحديد مركبة صالحة ونقطتي الانطلاق والوجهة." : "");

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <ScreenHeader title={confirmed ? "اكتمل الطلب التجريبي" : "مراجعة الرحلة"} eyebrow="الخطوة ٣ من ٣" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <View style={[styles.introIcon, confirmed && styles.successIcon]}>
              <MaterialCommunityIcons name={confirmed ? "check" : "clipboard-text-outline"} size={26} color={confirmed ? COLORS.white : COLORS.petrol} />
            </View>
            <Text style={styles.title}>{confirmed ? "تم حفظ طلبك التجريبي" : "راجع تفاصيل مشوارك"}</Text>
            <Text style={styles.subtitle}>
              {confirmed ? "تم حفظ البيانات في قاعدة التطبيق. لم يتم إرسال طلب إلى سائق." : "تأكد من اختيار المركبة وبيانات الرحلة قبل المتابعة."}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              {validVehicle ? (
                <>
                  <View style={styles.vehicleCopy}>
                    <Text style={styles.vehicleName}>{vehicle.title}</Text>
                    <Text style={styles.vehicleSeats}>حتى {vehicle.seats} ركاب</Text>
                  </View>
                  <VehicleVisual vehicle={vehicle} size="thumbnail" />
                </>
              ) : (
                <View style={styles.missingVehicle}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.error} />
                  <Text style={styles.errorText}>لم يتم اختيار مركبة صالحة</Text>
                </View>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.routeRow}>
              <View style={styles.routeLabels}>
                <View style={styles.locationBlock}>
                  <Text style={styles.locationCaption}>الانطلاق</Text>
                  <Text style={styles.locationValue}>{origin}</Text>
                </View>
                <View style={styles.locationBlock}>
                  <Text style={styles.locationCaption}>الوجهة</Text>
                  <Text style={styles.locationValue}>{destination}</Text>
                </View>
              </View>
              <View style={styles.routeLineContainer}><RouteLine /></View>
            </View>
          </View>

          <View style={styles.disclaimer}>
            <MaterialCommunityIcons name="information-outline" size={21} color={COLORS.petrolDark} />
            <View style={styles.disclaimerCopy}>
              <Text style={styles.disclaimerTitle}>نموذج تجريبي فقط</Text>
              <Text style={styles.disclaimerText}>حفظ البيانات لا ينشئ حجزًا فعليًا، ولا يتم إرسال سائق أو تنفيذ أي دفع أو خصم.</Text>
            </View>
          </View>

          {visibleError ? (
            <View style={styles.errorMessage}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>{visibleError}</Text>
            </View>
          ) : null}
          {confirmed ? (
            <View style={styles.successMessage}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color={COLORS.petrol} />
              <Text style={styles.successText}>تم حفظ التأكيد التجريبي بنجاح.</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          {confirmed ? (
            <PrimaryButton title="العودة للرئيسية" onPress={() => router.replace("/")} icon="home" />
          ) : requestIsValid ? (
            <>
              <PrimaryButton
                title={submitRequest.isPending ? "جارٍ حفظ الطلب..." : "تأكيد الطلب التجريبي"}
                onPress={confirmDemoRequest}
                icon={submitRequest.isPending ? "hourglass-empty" : "check"}
                disabled={submitRequest.isPending}
              />
              <Text style={styles.footerNote}>لن يتم إنشاء حجز أو دفع فعلي.</Text>
            </>
          ) : (
            <PrimaryButton title="العودة لاختيار المركبة" onPress={() => router.replace("/")} icon="home" />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24, gap: 20 },
  intro: { alignItems: "center", gap: 8, paddingVertical: 8 },
  introIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLORS.paleGreen, alignItems: "center", justifyContent: "center" },
  successIcon: { backgroundColor: COLORS.petrol },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  subtitle: { maxWidth: 280, color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: "center", writingDirection: "rtl" },
  summaryCard: { backgroundColor: COLORS.card, borderRadius: 23, borderWidth: 1, borderColor: COLORS.line, padding: 17, gap: 16 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  vehicleCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  vehicleName: { color: COLORS.ink, fontSize: 15, fontWeight: "800", writingDirection: "rtl" },
  vehicleSeats: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  missingVehicle: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  divider: { height: 1, backgroundColor: COLORS.line },
  routeRow: { flexDirection: "row-reverse", gap: 12 },
  routeLabels: { flex: 1, gap: 18 },
  locationBlock: { alignItems: "flex-end", gap: 3 },
  locationCaption: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  locationValue: { color: COLORS.ink, fontSize: 14, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  routeLineContainer: { width: 36, alignItems: "center", paddingTop: 15 },
  disclaimer: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 11, padding: 15, borderRadius: 18, backgroundColor: COLORS.paleAmber, borderWidth: 1, borderColor: "#F1DFB9" },
  disclaimerCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  disclaimerTitle: { color: COLORS.petrolDark, fontSize: 13, fontWeight: "900", writingDirection: "rtl" },
  disclaimerText: { color: COLORS.ink, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  errorMessage: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: "#FCE9E5" },
  errorText: { flex: 1, color: COLORS.error, fontSize: 12, textAlign: "right", writingDirection: "rtl" },
  successMessage: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  successText: { color: COLORS.petrol, fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.cream },
  footerNote: { color: COLORS.muted, fontSize: 11, textAlign: "center", writingDirection: "rtl" },
});
