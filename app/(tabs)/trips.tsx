import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, ScreenHeader } from "@/components/tarhal-ui";
import { trpc } from "@/lib/trpc";
import { VEHICLES } from "@/data/vehicles";

const STATUS: Record<string, string> = {
  requested: "بانتظار سائق",
  accepted: "قبل السائق الرحلة",
  in_progress: "الرحلة جارية",
  completed: "اكتملت الرحلة",
  cancelled: "أُلغيت الرحلة",
};

function TripsContent() {
  const router = useRouter();
  const trips = trpc.ride.mine.useQuery(undefined, { refetchInterval: 5_000 });

  return (
    <ScreenContainer>
      <ScreenHeader title="رحلاتي" eyebrow="ترحال" onBack={() => router.replace("/")} />
      {trips.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View>
      ) : trips.error ? (
        <View style={styles.center}><Text style={styles.error}>{trips.error.message}</Text></View>
      ) : trips.data?.length ? (
        <ScrollView contentContainerStyle={styles.list}>
          {trips.data.map((ride) => {
            const vehicle = VEHICLES.find((item) => item.id === ride.vehicleId);
            return (
              <Pressable key={ride.id} onPress={() => router.push({ pathname: "/trip/live/[id]", params: { id: String(ride.id) } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.cardTop}>
                  <Text style={styles.status}>{STATUS[ride.status] ?? "حالة الرحلة"}</Text>
                  <MaterialCommunityIcons name="car-side" size={24} color={COLORS.petrol} />
                </View>
                <Text style={styles.vehicle}>{vehicle?.title ?? "مركبة ترحال"}</Text>
                <View style={styles.route}><Text style={styles.location}>{ride.destination}</Text><MaterialCommunityIcons name="map-marker-path" size={18} color={COLORS.amber} /><Text style={styles.location}>{ride.origin}</Text></View>
                <Text style={styles.open}>{ride.status === "in_progress" ? "عرض موقع السيارة" : "عرض تفاصيل الرحلة"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <MaterialCommunityIcons name="map-marker-path" size={38} color={COLORS.petrol} />
          <Text style={styles.emptyTitle}>لا توجد رحلات بعد</Text>
          <Text style={styles.emptyCopy}>ستظهر طلباتك وحالاتها هنا.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

export default function MyTripsScreen() {
  return <AuthGate title="رحلاتي">{() => <TripsContent />}</AuthGate>;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  card: { padding: 16, borderRadius: 21, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, gap: 11 },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  status: { color: COLORS.petrolDark, fontSize: 13, fontWeight: "900", writingDirection: "rtl" },
  vehicle: { color: COLORS.ink, fontSize: 15, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  route: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  location: { flex: 1, color: COLORS.muted, fontSize: 12, textAlign: "right", writingDirection: "rtl" },
  open: { color: COLORS.petrol, fontSize: 12, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, padding: 24 },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900", writingDirection: "rtl" },
  emptyCopy: { color: COLORS.muted, fontSize: 12, writingDirection: "rtl" },
  error: { color: COLORS.error, textAlign: "center", writingDirection: "rtl" },
  pressed: { opacity: 0.78 },
});
