import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import * as Auth from "@/lib/_core/auth";
import { emailAuthRequest } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "register" | "verify" | "forgot" | "reset";

type AuthResponse = {
  app_session_id?: string;
};

const GENERIC_ERROR = "تعذر إكمال الطلب الآن. تحقق من البيانات والاتصال ثم حاول مجددًا.";

export default function EmailAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const requestedReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = requestedReturnTo && /^\/(?!\/)[A-Za-z0-9/()_-]*$/.test(requestedReturnTo) && !requestedReturnTo.startsWith("/auth")
    ? requestedReturnTo
    : "/(tabs)";

  async function establishUserSession(result: AuthResponse) {
    if (Platform.OS !== "web" && !result.app_session_id) {
      throw new Error("session unavailable");
    }
    if (result.app_session_id) await Auth.setSessionToken(result.app_session_id);
    await utils.auth.me.invalidate();
    const user = await utils.auth.me.fetch();
    if (!user) throw new Error("session unavailable");
    await Auth.setUserInfo({
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: new Date(user.lastSignedIn),
    });
    router.replace(returnTo as Href);
  }

  async function submit() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "register") {
        await emailAuthRequest("/api/auth/email/register", {
          email: normalizedEmail,
          password,
          name: name.trim() || undefined,
        });
        setMode("verify");
        setNotice("إذا كان البريد متاحًا، ستصلك رسالة برمز التحقق. أدخل الرمز لإكمال التسجيل.");
      } else if (mode === "verify") {
        const result = await emailAuthRequest<AuthResponse>("/api/auth/email/verify", {
          email: normalizedEmail,
          code: code.trim(),
        });
        await establishUserSession(result);
      } else if (mode === "login") {
        const result = await emailAuthRequest<AuthResponse>("/api/auth/email/login", {
          email: normalizedEmail,
          password,
        });
        await establishUserSession(result);
      } else if (mode === "forgot") {
        await emailAuthRequest("/api/auth/email/request-password-reset", {
          email: normalizedEmail,
        });
        setMode("reset");
        setNotice("إذا كان البريد مسجلًا وموثقًا، ستصلك رسالة برمز استعادة صالح لفترة محدودة.");
      } else {
        await emailAuthRequest("/api/auth/email/reset-password", {
          email: normalizedEmail,
          code: code.trim(),
          password,
        });
        setMode("login");
        setPassword("");
        setCode("");
        setNotice("تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.");
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const endpoint = mode === "verify"
        ? "/api/auth/email/resend"
        : "/api/auth/email/request-password-reset";
      await emailAuthRequest(endpoint, { email: normalizedEmail });
      setNotice("إذا كان البريد مؤهلًا، ستصلك رسالة جديدة. انتظر دقيقة قبل طلب رمز آخر.");
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "register" ? "إنشاء حساب" : mode === "verify" ? "تحقق من بريدك" : mode === "forgot" || mode === "reset" ? "استعادة الحساب" : "تسجيل الدخول";
  const submitTitle = mode === "register" ? "إرسال رمز التحقق" : mode === "verify" ? "تحقق وأكمل التسجيل" : mode === "login" ? "تسجيل الدخول" : mode === "forgot" ? "إرسال رمز الاستعادة" : "حفظ كلمة المرور الجديدة";

  return (
    <ScreenContainer>
      <ScreenHeader title={title} eyebrow="ترحال" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {mode === "register" ? "أنشئ حسابًا لمتابعة رحلاتك وتقديم طلب اعتماد سائق." :
              mode === "verify" ? "أدخل الرمز المكوّن من 8 أرقام الذي أرسلناه إلى بريدك." :
              mode === "forgot" || mode === "reset" ? "استعد الوصول إلى حسابك بأمان." :
              "استخدم بريدك الإلكتروني وكلمة المرور لمتابعة رحلتك."}
          </Text>
        </View>

        {mode === "register" ? (
          <Field label="الاسم (اختياري)" value={name} onChangeText={setName} placeholder="الاسم الذي يظهر في الرحلة" autoCapitalize="words" />
        ) : null}
        {mode !== "verify" && mode !== "reset" ? (
          <Field
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        ) : (
          <View style={styles.readOnlyEmail}>
            <Text style={styles.fieldLabel}>البريد الإلكتروني</Text>
            <Text style={styles.emailValue} selectable>{normalizedEmail || "—"}</Text>
          </View>
        )}
        {mode === "verify" || mode === "reset" ? (
          <Field
            label="رمز البريد (8 أرقام)"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 8))}
            placeholder="00000000"
            keyboardType="number-pad"
            maxLength={8}
            autoComplete="one-time-code"
          />
        ) : null}
        {mode === "login" || mode === "register" || mode === "reset" ? (
          <Field
            label={mode === "reset" ? "كلمة المرور الجديدة" : "كلمة المرور"}
            value={password}
            onChangeText={setPassword}
            placeholder="10 أحرف على الأقل"
            secureTextEntry
            autoCapitalize="none"
            maxLength={128}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            textContentType={mode === "login" ? "password" : "newPassword"}
          />
        ) : null}

        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <View style={styles.submitWrap}>
          {busy ? <ActivityIndicator color={COLORS.petrol} size="small" /> : null}
          <PrimaryButton title={busy ? "جارٍ التنفيذ…" : submitTitle} onPress={() => void submit()} disabled={busy} icon={mode === "login" ? "login" : "email"} />
        </View>

        {mode === "verify" || mode === "reset" ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void resendCode()} style={styles.textButton}>
            <Text style={styles.linkText}>إعادة إرسال الرمز</Text>
          </Pressable>
        ) : null}
        {mode === "login" ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => { setMode("forgot"); setError(""); setNotice(""); }} style={styles.textButton}>
              <Text style={styles.linkText}>نسيت كلمة المرور؟</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMode("register"); setError(""); setNotice(""); }} style={styles.textButton}>
              <Text style={styles.linkText}>ليس لديك حساب؟ أنشئ حسابًا</Text>
            </Pressable>
          </>
        ) : mode !== "register" ? (
          <Pressable accessibilityRole="button" onPress={() => { setMode("login"); setError(""); setNotice(""); }} style={styles.textButton}>
            <Text style={styles.linkText}>العودة إلى تسجيل الدخول</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => { setMode("login"); setError(""); setNotice(""); }} style={styles.textButton}>
            <Text style={styles.linkText}>لديك حساب؟ سجّل الدخول</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="link" onPress={() => router.push("/legal/privacy")} style={styles.textButton}>
          <Text style={styles.linkText}>مسودة سياسة الخصوصية</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, inputProps.keyboardType === "email-address" && styles.ltrInput, style]}
        placeholderTextColor={COLORS.muted}
        accessibilityLabel={label}
        textAlign={inputProps.keyboardType === "email-address" ? "left" : "right"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 34, gap: 16 },
  heading: { gap: 8, alignItems: "flex-end", paddingTop: 10, paddingBottom: 4 },
  title: { color: COLORS.ink, fontSize: 24, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 21, textAlign: "right", writingDirection: "rtl" },
  field: { gap: 7 },
  fieldLabel: { color: COLORS.ink, fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink, paddingHorizontal: 14, fontSize: 15, writingDirection: "rtl" },
  ltrInput: { writingDirection: "ltr" },
  readOnlyEmail: { gap: 7, alignItems: "flex-end" },
  emailValue: { color: COLORS.muted, fontSize: 14, writingDirection: "ltr" },
  notice: { color: COLORS.petrolDark, backgroundColor: COLORS.paleGreen, borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  error: { color: COLORS.error, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  submitWrap: { gap: 10, paddingTop: 5 },
  textButton: { alignSelf: "center", paddingVertical: 7, paddingHorizontal: 10 },
  linkText: { color: COLORS.petrol, fontSize: 13, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
});
