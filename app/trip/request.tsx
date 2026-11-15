import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, RouteLine, ScreenHeader } from "@/components/tarhal-ui";
import { VehicleVisual } from "@/components/vehicle-visual";
import { getVehicle, isVehicleId } from "@/data/vehicles";

function TripRequestContent() {
  const params = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const vehicleId = Array.isArray(params.vehicleId) ? params.vehicleId[0] : params.vehicleId;
  const vehicle = getVehicle(vehicleId);
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");

  const continueToReview = () => {
    if (!isVehicleId(vehicleId)) {
      setError("اختر نوع المركبة قبل إدخال بيانات الرحلة.");
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setError("أدخل نقطة الانطلاق والوجهة للمتابعة.");
      return;
    }
    if (origin.trim().length > 255 || destination.trim().length > 255) {
      setError("يجب ألا تتجاوز نقطة الانطلاق أو الوجهة 255 حرفًا.");
      return;
    }
    setError("");
    router.push({
      pathname: "/trip/confirm",
      params: { vehicleId: vehicle.id, origin: origin.trim(), destination: destination.trim() },
    });
  };

  if (!isVehicleId(vehicleId)) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={styles.page}>
          <ScreenHeader title="اختيار المركبة" eyebrow="ترحال" onBack={() => router.replace("/")} />
          <View style={styles.invalidState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color={COLORS.error} />
            <Text style={styles.invalidText}>اختر فئة مركبة صالحة قبل إدخال بيانات الرحلة.</Text>
            <PrimaryButton title="العودة لاختيار المركبة" onPress={() => router.replace("/")} icon="home" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader title="تفاصيل الرحلة" eyebrow="الخطوة ٢ من ٣" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>بيانات الرحلة</Text>
              <Text style={styles.progressHint}>أين تبدأ وأين تنتهي؟</Text>
            </View>
            <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
          </View>

          <View style={styles.selectedVehicle}>
            <VehicleVisual vehicle={vehicle} size="thumbnail" />
            <View style={styles.vehicleCopy}>
              <Text style={styles.vehicleTitle}>{vehicle.title}</Text>
              <Text style={styles.vehicleMeta}>حتى {vehicle.seats} ركاب</Text>
            </View>
            <MaterialCommunityIcons name="check-decagram" size={21} color={COLORS.petrol} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>مسار رحلتك</Text>
            <View style={styles.routeFields}>
              <View style={styles.routeRail}><RouteLine /></View>
              <View style={styles.inputsColumn}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>نقطة الانطلاق</Text>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={COLORS.petrol} />
                    <TextInput
                      value={origin}
                      onChangeText={(value) => { setOrigin(value); if (error) setError(""); }}
                      placeholder="مثال: وسط المدينة"
                      placeholderTextColor="#9AA7A0"
                      style={styles.input}
                      textAlign="right"
                      returnKeyType="next"
                      maxLength={255}
                      accessibilityLabel="نقطة الانطلاق"
                    />
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>الوجهة</Text>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="map-marker-check-outline" size={20} color={COLORS.amber} />
                    <TextInput
                      value={destination}
                      onChangeText={(value) => { setDestination(value); if (error) setError(""); }}
                      placeholder="إلى أين تريد الذهاب؟"
                      placeholderTextColor="#9AA7A0"
                      style={styles.input}
                      textAlign="right"
                      returnKeyType="done"
                      maxLength={255}
                      accessibilityLabel="الوجهة"
                    />
                  </View>
                </View>
              </View>
            </View>
            {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.hintCard}>
            <MaterialCommunityIcons name="information-outline" size={19} color={COLORS.petrol} />
            <Text style={styles.hintText}>بعد إرسال الطلب سيظهر للسائقين المعتمدين فقط، ويشارك السائق موقعه بعد بدء الرحلة.</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton title="مراجعة طلب الرحلة" onPress={continueToReview} icon="arrow-back" />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export default function TripRequestScreen() {
  return <AuthGate title="طلب رحلة">{() => <TripRequestContent />}</AuthGate>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  invalidState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
  invalidText: { color: COLORS.ink, fontSize: 15, fontWeight: "700", textAlign: "center", writingDirection: "rtl" },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20, gap: 20 },
  progressBlock: { gap: 10 },
  progressLabels: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "800", writingDirection: "rtl" },
  progressHint: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  progressTrack: { height: 6, borderRadius: 6, backgroundColor: "#E5E7DE", overflow: "hidden", alignItems: "flex-end" },
  progressFill: { width: "64%", height: "100%", backgroundColor: COLORS.petrol, borderRadius: 6 },
  selectedVehicle: { backgroundColor: COLORS.paleGreen, borderRadius: 18, padding: 11, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  vehicleCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  vehicleTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800", writingDirection: "rtl" },
  vehicleMeta: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  formCard: { padding: 17, backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, gap: 17 },
  formTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  routeFields: { flexDirection: "row-reverse", gap: 11 },
  routeRail: { width: 22, alignItems: "center", paddingTop: 36 },
  inputsColumn: { flex: 1, gap: 18 },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  inputWrap: { minHeight: 52, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: "row-reverse", alignItems: "center", gap: 9, paddingHorizontal: 13 },
  input: { flex: 1, paddingVertical: 10, color: COLORS.ink, fontSize: 13, writingDirection: "rtl" },
  errorText: { color: COLORS.error, fontSize: 12, textAlign: "right", writingDirection: "rtl" },
  hintCard: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 16, backgroundColor: COLORS.paleAmber },
  hintText: { flex: 1, color: COLORS.ink, fontSize: 11, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.cream },
});
