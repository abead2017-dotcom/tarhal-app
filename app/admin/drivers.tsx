import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, ScreenHeader } from "@/components/tarhal-ui";
import { VEHICLES } from "@/data/vehicles";
import { trpc } from "@/lib/trpc";

function AdminDriversContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const applications = trpc.admin.driverApplications.useQuery(undefined, { refetchInterval: 10_000 });
  const review = trpc.admin.reviewDriver.useMutation({
    onSuccess: async () => utils.admin.driverApplications.invalidate(),
  });

  return (
    <ScreenContainer>
      <ScreenHeader title="اعتماد السائقين" eyebrow="إدارة ترحال" onBack={() => router.back()} />
      {applications.isLoading ? <View style={styles.center}><ActivityIndicator color={COLORS.petrol} /></View> : applications.error ? <View style={styles.center}><Text style={styles.error}>{applications.error.message}</Text></View> : applications.data?.length ? (
        <ScrollView contentContainerStyle={styles.list}>
          {applications.data.map((application) => {
            const vehicle = VEHICLES.find((item) => item.id === application.vehicleId);
            return (
              <View key={application.id} style={styles.card}>
                <View style={styles.cardTop}><Text style={styles.status}>{application.status === "pending" ? "بانتظار المراجعة" : application.status === "approved" ? "معتمد" : "مرفوض"}</Text><MaterialCommunityIcons name="account-check-outline" size={23} color={COLORS.petrol} /></View>
                <Text style={styles.name}>{application.name || "مستخدم ترحال"}</Text>
                {application.email ? <Text style={styles.email}>{application.email}</Text> : null}
                <Text style={styles.vehicle}>فئة المركبة: {vehicle?.name ?? application.vehicleId}</Text>
                {application.status === "pending" ? (
                  <View style={styles.actions}>
                    <Pressable disabled={review.isPending} onPress={() => review.mutate({ applicationId: application.id, decision: "rejected" })} style={[styles.action, styles.reject]}><Text style={styles.rejectText}>رفض</Text></Pressable>
                    <Pressable disabled={review.isPending} onPress={() => review.mutate({ applicationId: application.id, decision: "approved" })} style={[styles.action, styles.approve]}><Text style={styles.approveText}>اعتماد السائق</Text></Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
          {review.error ? <Text style={styles.error}>{review.error.message}</Text> : null}
        </ScrollView>
      ) : <View style={styles.center}><Text style={styles.empty}>لا توجد طلبات اعتماد.</Text></View>}
    </ScreenContainer>
  );
}

export default function AdminDriversScreen() {
  return <AuthGate requireAdmin title="اعتماد السائقين">{() => <AdminDriversContent />}</AuthGate>;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  card: { padding: 16, borderRadius: 21, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, gap: 8 },
  cardTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  status: { color: COLORS.petrol, fontSize: 12, fontWeight: "900", writingDirection: "rtl" },
  name: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  email: { color: COLORS.muted, fontSize: 12, textAlign: "right" },
  vehicle: { color: COLORS.muted, fontSize: 12, textAlign: "right", writingDirection: "rtl" },
  actions: { flexDirection: "row-reverse", gap: 9, marginTop: 6 },
  action: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  approve: { backgroundColor: COLORS.petrol },
  reject: { backgroundColor: "#F8E8E5" },
  approveText: { color: COLORS.white, fontWeight: "800", writingDirection: "rtl" },
  rejectText: { color: COLORS.error, fontWeight: "800", writingDirection: "rtl" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  empty: { color: COLORS.muted, fontSize: 13, writingDirection: "rtl" },
  error: { color: COLORS.error, fontSize: 12, textAlign: "center", writingDirection: "rtl" },
});
