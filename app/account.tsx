import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import * as Auth from "@/lib/_core/auth";
import { apiCall } from "@/lib/_core/api";
import { stopDriverLocationTracking } from "@/lib/driver-location";
import { trpc } from "@/lib/trpc";

type AccountUser = { email: string | null; name: string | null };

export default function AccountScreen() {
  return <AuthGate title="حسابي">{(user) => <AccountContent user={user} />}</AuthGate>;
}

function AccountContent({ user }: { user: AccountUser }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      try {
        await stopDriverLocationTracking();
      } catch {
        // Server-side session revocation below prevents any remaining task from updating GPS.
      }
      await apiCall("/api/auth/logout", { method: "POST" });
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      await utils.auth.me.invalidate();
      router.replace("/");
    } catch {
      setError("تعذر إنهاء الجلسة الآن. تحقق من اتصالك ثم حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="حسابي" eyebrow="ترحال" onBack={() => router.back()} />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{user.name || "حساب ترحال"}</Text>
          <Text style={styles.email}>{user.email || "لا يوجد بريد مسجل"}</Text>
          <Text style={styles.description}>تُستخدم بيانات الحساب لإدارة طلبات الرحلات وطلب اعتماد السائق.</Text>
        </View>
        <PrimaryButton title="حذف الحساب والبيانات" onPress={() => router.push("/delete-account")} icon="delete-outline" />
        <PrimaryButton title="مسودة سياسة الخصوصية" onPress={() => router.push("/legal/privacy")} icon="description" />
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={COLORS.petrol} /> : <PrimaryButton title="تسجيل الخروج" onPress={() => void logout()} icon="logout" />}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 12, gap: 14 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.line, borderWidth: 1, borderRadius: 20, padding: 18, gap: 8 },
  name: { color: COLORS.ink, fontSize: 19, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  email: { color: COLORS.petrolDark, fontSize: 14, textAlign: "right", writingDirection: "ltr" },
  description: { color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl", paddingTop: 5 },
  error: { color: COLORS.error, fontSize: 12, textAlign: "center", writingDirection: "rtl" },
});
