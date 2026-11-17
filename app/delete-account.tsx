import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import * as Auth from "@/lib/_core/auth";
import { emailAuthRequest } from "@/lib/_core/api";
import { stopDriverLocationTracking } from "@/lib/driver-location";

type DeleteUser = { email: string | null };

export default function DeleteAccountScreen() {
  return <AuthGate title="حذف الحساب">{(user) => <DeleteAccountContent user={user} />}</AuthGate>;
}

function DeleteAccountContent({ user }: { user: DeleteUser }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function requestCode() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await emailAuthRequest("/api/auth/email/request-delete", { password });
      setStep("code");
      setNotice("إذا كان الحساب مؤهلًا، أرسلنا رمز تأكيد إلى بريدك الموثق.");
    } catch {
      setError("تعذر إرسال رمز الحذف. تحقق من كلمة المرور والاتصال ثم حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      await emailAuthRequest("/api/auth/email/delete", {
        password,
        code: code.trim(),
        confirm: true,
      });
      try {
        await stopDriverLocationTracking();
      } catch {
        // Server-side deletion remains authoritative if the OS prevents task shutdown.
      }
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      router.replace("/");
    } catch {
      setError("تعذر حذف الحساب. تحقق من الرمز والتأكيد، وتأكد من عدم وجود رحلة مقبولة أو جارية.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await emailAuthRequest("/api/auth/email/request-delete", { password });
      setNotice("إذا كان الحساب مؤهلًا، أرسلنا رمزًا جديدًا إلى بريدك. انتظر دقيقة قبل المحاولة التالية.");
    } catch {
      setError("تعذر إعادة إرسال الرمز الآن. انتظر قليلًا ثم حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="حذف الحساب" eyebrow="ترحال" onBack={() => router.back()} />
      <View style={styles.content}>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>هذا الإجراء نهائي</Text>
          <Text style={styles.copy}>سيُحذف حسابك ورحلاتك بصفتك راكبًا وطلب اعتماد السائق ونقاط الموقع والرموز والجلسات. تبقى الرحلات المكتملة التي قدتها للراكب الآخر، مع إزالة هويتك وموقعك.</Text>
          <Text style={styles.copy}>لا يمكن حذف الحساب أثناء رحلة مقبولة أو جارية؛ أنهِ الرحلة أولًا.</Text>
        </View>
        <Text style={styles.email}>{user.email || ""}</Text>
        <Field label="كلمة المرور الحالية" value={password} onChangeText={setPassword} secureTextEntry editable={step === "password"} />
        {step === "password" ? (
          <PrimaryButton title={busy ? "جارٍ الإرسال…" : "إرسال رمز التأكيد إلى بريدي"} onPress={() => void requestCode()} disabled={busy || !password} icon="email" />
        ) : (
          <>
            <Field label="رمز الحذف المرسل إلى بريدك" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 8))} keyboardType="number-pad" maxLength={8} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void resendCode()} style={styles.resend}>
              <Text style={styles.resendText}>إعادة إرسال الرمز</Text>
            </Pressable>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed((value) => !value)} style={styles.confirmRow}>
              <View style={[styles.checkbox, confirmed && styles.checkboxChecked]} />
              <Text style={styles.confirmText}>أؤكد أنني أطلب حذف حسابي وبياناتي نهائيًا.</Text>
            </Pressable>
            <PrimaryButton title={busy ? "جارٍ الحذف…" : "تأكيد حذف الحساب نهائيًا"} onPress={() => void deleteAccount()} disabled={busy || !confirmed || code.length !== 8} icon="delete-outline" />
          </>
        )}
        {busy ? <ActivityIndicator color={COLORS.petrol} /> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <Text style={styles.small}>لن يُحذف الحساب قبل التحقق من كلمة المرور والرمز والتأكيد على الخادم.</Text>
      </View>
    </ScreenContainer>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} style={[styles.input, style]} placeholderTextColor={COLORS.muted} accessibilityLabel={label} textAlign="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 10, gap: 15 },
  warning: { borderRadius: 18, borderWidth: 1, borderColor: "#EBC9A4", backgroundColor: COLORS.paleAmber, padding: 15, gap: 9 },
  warningTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  copy: { color: COLORS.ink, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  email: { color: COLORS.muted, fontSize: 13, textAlign: "right", writingDirection: "ltr" },
  field: { gap: 7 },
  label: { color: COLORS.ink, fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink, paddingHorizontal: 14, fontSize: 15 },
  confirmRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.petrol, backgroundColor: COLORS.card },
  checkboxChecked: { backgroundColor: COLORS.petrol, borderColor: COLORS.petrol },
  confirmText: { flex: 1, color: COLORS.ink, fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
  resend: { alignSelf: "center", paddingHorizontal: 10, paddingVertical: 5 },
  resendText: { color: COLORS.petrol, fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  notice: { color: COLORS.petrolDark, fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
  error: { color: COLORS.error, fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
  small: { color: COLORS.muted, fontSize: 11, lineHeight: 17, textAlign: "center", writingDirection: "rtl" },
});
