import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, RouteLine, ScreenHeader } from "@/components/tarhal-ui";
import { VehicleVisual } from "@/components/vehicle-visual";
import { getVehicle, isVehicleId } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

function TripConfirmContent() {
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
  const utils = trpc.useUtils();
  const createRide = trpc.ride.create.useMutation({
    onSuccess: async (ride) => {
      await utils.ride.mine.invalidate();
      router.replace({ pathname: "/trip/live/[id]", params: { id: String(ride.id) } });
    },
  });

  const confirmRide = () => {
    if (!isVehicleId(vehicleId) || !rawOrigin || rawOrigin.length > 255 || !rawDestination || rawDestination.length > 255) return;
    createRide.mutate({ vehicleId, origin: rawOrigin, destination: rawDestination });
  };

  const visibleError = createRide.error?.message || (!requestIsValid ? "بيانات الطلب غير مكتملة؛ أعد اختيار مركبة صالحة وأدخل الانطلاق والوجهة." : "");

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <ScreenHeader title="مراجعة الرحلة" eyebrow="الخطوة ٣ من ٣" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <View style={styles.introIcon}><MaterialCommunityIcons name="clipboard-text-outline" size={26} color={COLORS.petrol} /></View>
            <Text style={styles.title}>أرسل طلبك للسائقين</Text>
            <Text style={styles.subtitle}>راجع تفاصيل الرحلة؛ سيظهر طلبك للسائقين المعتمدين من فئة المركبة المختارة.</Text>
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
                <View style={styles.locationBlock}><Text style={styles.locationCaption}>الانطلاق</Text><Text style={styles.locationValue}>{origin}</Text></View>
                <View style={styles.locationBlock}><Text style={styles.locationCaption}>الوجهة</Text><Text style={styles.locationValue}>{destination}</Text></View>
              </View>
              <View style={styles.routeLineContainer}><RouteLine /></View>
            </View>
          </View>

          <View style={styles.disclaimer}>
            <MaterialCommunityIcons name="information-outline" size={21} color={COLORS.petrolDark} />
            <View style={styles.disclaimerCopy}>
              <Text style={styles.disclaimerTitle}>إشعار الرحلة</Text>
              <Text style={styles.disclaimerText}>لا يوجد دفع أو تسعير في هذه النسخة. يُشارك موقع السائق معك فقط بعد قبوله الرحلة وبدئها.</Text>
            </View>
          </View>

          {visibleError ? <View style={styles.errorMessage}><MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.error} /><Text accessibilityLiveRegion="polite" style={styles.errorText}>{visibleError}</Text></View> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton
            title={createRide.isPending ? "جارٍ إرسال طلب الرحلة…" : "إرسال طلب الرحلة"}
            onPress={confirmRide}
            icon={createRide.isPending ? "hourglass-empty" : "send"}
            disabled={createRide.isPending || !requestIsValid}
          />
          <Text style={styles.footerNote}>لن يبدأ تتبع الموقع قبل قبول السائق وبدء الرحلة.</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

export default function TripConfirmScreen() {
  return <AuthGate title="مراجعة الرحلة">{() => <TripConfirmContent />}</AuthGate>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24, gap: 20 },
  intro: { alignItems: "center", gap: 8, paddingVertical: 8 },
  introIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLORS.paleGreen, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  subtitle: { maxWidth: 300, color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: "center", writingDirection: "rtl" },
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
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.cream },
  footerNote: { color: COLORS.muted, fontSize: 11, textAlign: "center", writingDirection: "rtl" },
});
