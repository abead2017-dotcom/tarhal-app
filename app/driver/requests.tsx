import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import { VEHICLES } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

function DriverRequestsContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const application = trpc.driver.applicationStatus.useQuery();
  const currentRide = trpc.driver.currentRide.useQuery(undefined, { refetchInterval: 5_000 });
  const requests = trpc.driver.availableRides.useQuery(undefined, { enabled: application.data?.status === "approved", refetchInterval: 5_000 });
  const accept = trpc.driver.acceptRide.useMutation({
    onSuccess: async (ride) => {
      await Promise.all([utils.driver.availableRides.invalidate(), utils.driver.currentRide.invalidate()]);
      router.push({ pathname: "/driver/active/[id]", params: { id: String(ride.id) } });
    },
  });

  if (application.isLoading || currentRide.isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View>;
  if (application.data?.status !== "approved") {
    return <View style={styles.center}><Text style={styles.title}>اعتماد السائق مطلوب</Text><Text style={styles.copy}>قدّم طلب اعتماد أو انتظر موافقة المشرف.</Text><PrimaryButton title="حالة طلب السائق" onPress={() => router.replace("/driver/apply")} icon="fact-check" /></View>;
  }
  if (currentRide.data) {
    return <View style={styles.center}><MaterialCommunityIcons name="car-clock" size={38} color={COLORS.petrol} /><Text style={styles.title}>لديك رحلة نشطة</Text><Text style={styles.copy}>أكمل الرحلة الحالية قبل قبول طلب آخر.</Text><PrimaryButton title="فتح الرحلة" onPress={() => router.push({ pathname: "/driver/active/[id]", params: { id: String(currentRide.data.id) } })} icon="map" /></View>;
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="رحلات متاحة" eyebrow="وضع السائق" onBack={() => router.back()} />
      {requests.isLoading ? <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View> : requests.error ? <View style={styles.center}><Text style={styles.error}>{requests.error.message}</Text></View> : requests.data?.length ? (
        <ScrollView contentContainerStyle={styles.list}>
          {requests.data.map((ride) => {
            const vehicle = VEHICLES.find((item) => item.id === ride.vehicleId);
            const isAccepting = accept.isPending && accept.variables?.rideId === ride.id;
            return (
              <View key={ride.id} style={styles.card}>
                <View style={styles.cardTop}><Text style={styles.vehicle}>{vehicle?.title ?? "مركبة"}</Text><MaterialCommunityIcons name="car-side" size={25} color={COLORS.petrol} /></View>
                <View style={styles.locationRow}><MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.petrol} /><Text style={styles.location}>{ride.origin}</Text></View>
                <View style={styles.locationRow}><MaterialCommunityIcons name="map-marker-check-outline" size={18} color={COLORS.amber} /><Text style={styles.location}>{ride.destination}</Text></View>
                {accept.error ? <Text style={styles.error}>{accept.error.message}</Text> : null}
                <PrimaryButton title={isAccepting ? "جارٍ قبول الرحلة…" : "قبول الرحلة"} onPress={() => accept.mutate({ rideId: ride.id })} disabled={accept.isPending} icon="check" />
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.center}><MaterialCommunityIcons name="map-search-outline" size={38} color={COLORS.petrol} /><Text style={styles.title}>لا توجد طلبات مطابقة الآن</Text><Text style={styles.copy}>سنحدّث القائمة تلقائيًا عند وصول طلب جديد.</Text></View>
      )}
    </ScreenContainer>
  );
}

export default function DriverRequestsScreen() {
  return <AuthGate title="رحلات السائق">{() => <DriverRequestsContent />}</AuthGate>;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 13 },
  card: { padding: 16, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, gap: 12 },
  cardTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  vehicle: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  location: { flex: 1, color: COLORS.muted, fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { color: COLORS.ink, fontSize: 19, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  copy: { color: COLORS.muted, fontSize: 12, lineHeight: 20, textAlign: "center", writingDirection: "rtl" },
  error: { color: COLORS.error, fontSize: 12, textAlign: "center", writingDirection: "rtl" },
});
