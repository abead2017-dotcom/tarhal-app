import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { LiveMap } from "@/components/live-map";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import { VEHICLES } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

const STATUS: Record<string, string> = {
  requested: "بانتظار سائق",
  accepted: "قبل السائق رحلتك",
  in_progress: "رحلتك جارية",
  completed: "اكتملت الرحلة",
  cancelled: "أُلغيت الرحلة",
};

function PassengerLiveContent({ rideId }: { rideId: number }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const result = trpc.ride.liveState.useQuery({ rideId }, { refetchInterval: 5_000, retry: false });
  const cancel = trpc.ride.cancel.useMutation({ onSuccess: async () => utils.ride.liveState.invalidate({ rideId }) });
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const ride = result.data?.ride;
  const location = result.data?.location;
  const locationAgeSeconds = now > 0 && location?.updatedAt
    ? Math.floor((now - new Date(location.updatedAt).getTime()) / 1_000)
    : null;
  const clockSkew = locationAgeSeconds !== null && locationAgeSeconds < -10;
  const stale = locationAgeSeconds !== null && locationAgeSeconds > 20;
  const locationWarning = stale || clockSkew;

  if (result.isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View>;
  if (result.error || !ride) return <View style={styles.center}><Text style={styles.error}>{result.error?.message ?? "لم نعثر على الرحلة."}</Text><PrimaryButton title="العودة" onPress={() => router.back()} /></View>;
  const vehicle = VEHICLES.find((item) => item.id === ride.vehicleId);
  const updatedAt = location?.updatedAt ? new Date(location.updatedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;
  const driverName = result.data?.driver?.name;

  return (
    <ScreenContainer>
      <ScreenHeader title="رحلتك" eyebrow="تحديث تلقائي" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <MaterialCommunityIcons name={ride.status === "in_progress" ? "crosshairs-gps" : "car-clock"} size={25} color={COLORS.petrol} />
          <View style={styles.statusCopy}>
            <Text style={styles.status}>{STATUS[ride.status] ?? "حالة الرحلة"}</Text>
            <Text style={styles.vehicle}>{vehicle?.title ?? "مركبة ترحال"}</Text>
            {result.data?.driver ? <Text style={styles.driver}>السائق: {driverName || "سائق ترحال"}</Text> : null}
          </View>
        </View>
        {ride.status === "in_progress" && location ? <LiveMap location={location} /> : (
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-marker-path" size={35} color={COLORS.petrol} />
            <Text style={styles.placeholderTitle}>
              {ride.status === "completed" || ride.status === "cancelled"
                ? "انتهت مشاركة الموقع لهذه الرحلة"
                : ride.status === "in_progress"
                  ? "بانتظار أول موقع من السائق"
                  : "تظهر الخريطة عند بدء الرحلة"}
            </Text>
            <Text style={styles.placeholderCopy}>لا يُشارك موقع السيارة قبل بدء السائق للرحلة.</Text>
          </View>
        )}
        {location && updatedAt ? (
          <View style={[styles.lastUpdate, locationWarning && styles.stale]}>
            <MaterialCommunityIcons name={locationWarning ? "clock-alert-outline" : "update"} size={18} color={locationWarning ? COLORS.error : COLORS.petrol} />
            <Text style={[styles.lastUpdateText, locationWarning && styles.staleText]}>
              {clockSkew
                ? "توقيت جهاز السائق غير متزامن؛ حداثة الموقع غير مؤكدة"
                : stale
                  ? `آخر تحديث منذ ${locationAgeSeconds} ثانية`
                  : `آخر تحديث · ${updatedAt}`}
            </Text>
          </View>
        ) : null}
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>الانطلاق</Text><Text style={styles.routeValue}>{ride.origin}</Text>
          <View style={styles.divider} />
          <Text style={styles.routeLabel}>الوجهة</Text><Text style={styles.routeValue}>{ride.destination}</Text>
        </View>
        {cancel.error ? <Text style={styles.error}>{cancel.error.message}</Text> : null}
        {ride.status === "requested" || ride.status === "accepted" ? (
          <PrimaryButton title={cancel.isPending ? "جارٍ إلغاء الرحلة…" : "إلغاء الرحلة"} onPress={() => cancel.mutate({ rideId })} disabled={cancel.isPending} icon="close" />
        ) : null}
        <Text style={styles.privacy}>يُشارك السائق موقعه لهذه الرحلة فقط، ويتوقف التتبع عند انتهائها.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function PassengerLiveScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const rideId = Number(rawId);
  if (!Number.isSafeInteger(rideId) || rideId <= 0) return <ScreenContainer><View style={styles.center}><Text style={styles.error}>رابط الرحلة غير صالح.</Text></View></ScreenContainer>;
  return <AuthGate title="متابعة الرحلة">{() => <PassengerLiveContent rideId={rideId} />}</AuthGate>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 13 },
  statusCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 15, borderRadius: 19, backgroundColor: COLORS.paleGreen },
  statusCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  status: { color: COLORS.petrolDark, fontSize: 15, fontWeight: "900", writingDirection: "rtl" },
  vehicle: { color: COLORS.muted, fontSize: 12, writingDirection: "rtl" },
  driver: { color: COLORS.ink, fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  mapPlaceholder: { height: 260, borderRadius: 24, backgroundColor: "#E8EFE9", alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  placeholderTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  placeholderCopy: { color: COLORS.muted, fontSize: 12, textAlign: "center", writingDirection: "rtl" },
  lastUpdate: { flexDirection: "row-reverse", alignItems: "center", gap: 7, alignSelf: "flex-end", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.paleGreen },
  lastUpdateText: { color: COLORS.petrolDark, fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
  stale: { backgroundColor: "#F8E8E5" },
  staleText: { color: COLORS.error },
  routeCard: { padding: 15, borderRadius: 19, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, gap: 7 },
  routeLabel: { color: COLORS.muted, fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  routeValue: { color: COLORS.ink, fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 4 },
  privacy: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "center", writingDirection: "rtl" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  error: { color: COLORS.error, fontSize: 13, textAlign: "center", writingDirection: "rtl" },
});
