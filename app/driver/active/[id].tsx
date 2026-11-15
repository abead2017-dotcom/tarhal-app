import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { LiveMap } from "@/components/live-map";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import { requestDriverLocationPermissions, startDriverLocationTracking, stopDriverLocationTracking } from "@/lib/driver-location";
import { trpc } from "@/lib/trpc";

function ActiveRideContent({ rideId }: { rideId: number }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const trip = trpc.ride.liveState.useQuery({ rideId }, { refetchInterval: 5_000, retry: false });
  const [locationError, setLocationError] = useState("");
  const [locationActionPending, setLocationActionPending] = useState(false);
  const start = trpc.driver.startRide.useMutation();
  const complete = trpc.driver.completeRide.useMutation();
  const ride = trip.data?.ride;
  const location = trip.data?.location;

  const beginRide = async () => {
    if (locationActionPending) return;
    setLocationError("");
    setLocationActionPending(true);
    try {
      await requestDriverLocationPermissions();
      await start.mutateAsync({ rideId });
      await utils.ride.liveState.invalidate({ rideId });
      try {
        await startDriverLocationTracking(rideId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "تعذر تشغيل GPS.";
        throw new Error(`بدأت الرحلة، لكن تعذّر تشغيل مشاركة الموقع: ${message} اضغط «استئناف مشاركة الموقع» بعد معالجة المشكلة.`);
      }
      await utils.ride.liveState.invalidate({ rideId });
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "تعذر بدء الرحلة أو مشاركة الموقع.");
    } finally {
      setLocationActionPending(false);
    }
  };

  const resumeSharing = async () => {
    if (locationActionPending) return;
    setLocationError("");
    setLocationActionPending(true);
    try {
      await requestDriverLocationPermissions();
      await startDriverLocationTracking(rideId);
      await utils.ride.liveState.invalidate({ rideId });
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "تعذر استئناف مشاركة الموقع.");
    } finally {
      setLocationActionPending(false);
    }
  };

  const finishRide = async () => {
    if (locationActionPending) return;
    setLocationError("");
    try {
      await complete.mutateAsync({ rideId });
      await stopDriverLocationTracking();
      await utils.ride.liveState.invalidate({ rideId });
      router.replace("/driver/requests");
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "تعذر إنهاء الرحلة.");
    }
  };

  if (trip.isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View>;
  if (trip.error || !ride) return <View style={styles.center}><Text style={styles.error}>{trip.error?.message ?? "لم نعثر على الرحلة."}</Text></View>;

  const updatedAt = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <ScreenContainer>
      <ScreenHeader title="الرحلة النشطة" eyebrow="وضع السائق" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <MaterialCommunityIcons name={ride.status === "in_progress" ? "crosshairs-gps" : "car-clock"} size={24} color={COLORS.petrol} />
          <Text style={styles.status}>
            {ride.status === "accepted"
              ? "مقبولة · لم تبدأ بعد"
              : ride.status === "in_progress"
                ? "الرحلة جارية"
                : ride.status === "completed"
                  ? "اكتملت الرحلة"
                  : `حالة الرحلة: ${ride.status}`}
          </Text>
        </View>
        {ride.status === "in_progress" && location ? (
          <LiveMap location={location} />
        ) : (
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-marker-path" size={32} color={COLORS.petrol} />
            <Text style={styles.placeholderText}>
              {ride.status === "accepted" ? "ابدأ الرحلة بعد استقبال الراكب" : "لا توجد نقطة موقع حديثة بعد"}
            </Text>
          </View>
        )}
        {updatedAt ? <Text style={styles.updated}>آخر موقع أُرسل عند {updatedAt}</Text> : null}
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>الانطلاق</Text>
          <Text style={styles.routeValue}>{ride.origin}</Text>
          <Text style={styles.routeLabel}>الوجهة</Text>
          <Text style={styles.routeValue}>{ride.destination}</Text>
        </View>
        {locationError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{locationError}</Text> : null}
        {ride.status === "accepted" ? (
          <PrimaryButton
            title={locationActionPending ? "جارٍ بدء الرحلة ومشاركة الموقع…" : "بدء الرحلة ومشاركة الموقع"}
            onPress={beginRide}
            disabled={locationActionPending || start.isPending}
            icon="navigation"
          />
        ) : null}
        {ride.status === "in_progress" ? (
          <>
            <PrimaryButton
              title={locationActionPending ? "جارٍ استئناف المشاركة…" : "استئناف مشاركة الموقع"}
              onPress={resumeSharing}
              disabled={locationActionPending || complete.isPending}
              icon="my-location"
            />
            <PrimaryButton
              title={complete.isPending ? "جارٍ إنهاء الرحلة…" : "إنهاء الرحلة"}
              onPress={finishRide}
              disabled={complete.isPending || locationActionPending}
              icon="check"
            />
          </>
        ) : null}
        <Text style={styles.privacy}>
          يظهر موقعك للراكب صاحب هذه الرحلة فقط. يستمر الإرسال في الخلفية بعد منح الإذن، ويتوقف عند الإكمال أو تسجيل الخروج.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function DriverActiveRideScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const rideId = Number(rawId);
  if (!Number.isSafeInteger(rideId) || rideId <= 0) {
    return <ScreenContainer><View style={styles.center}><Text style={styles.error}>رابط الرحلة غير صالح.</Text></View></ScreenContainer>;
  }
  return <AuthGate title="رحلة السائق">{() => <ActiveRideContent rideId={rideId} />}</AuthGate>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 13 },
  statusCard: { flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 14, borderRadius: 17, backgroundColor: COLORS.paleGreen },
  status: { flex: 1, color: COLORS.petrolDark, fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mapPlaceholder: { height: 230, borderRadius: 24, backgroundColor: "#E8EFE9", alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  placeholderText: { color: COLORS.ink, fontSize: 13, textAlign: "center", writingDirection: "rtl" },
  updated: { color: COLORS.muted, fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  routeCard: { padding: 15, borderRadius: 19, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, gap: 7 },
  routeLabel: { color: COLORS.muted, fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  routeValue: { color: COLORS.ink, fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl", marginBottom: 5 },
  privacy: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "center", writingDirection: "rtl" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  error: { color: COLORS.error, fontSize: 12, textAlign: "center", writingDirection: "rtl" },
});
