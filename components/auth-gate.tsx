import type { inferRouterOutputs } from "@trpc/server";
import { usePathname, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS, PrimaryButton, ScreenHeader } from "@/components/tarhal-ui";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import type { AppRouter } from "@/server/routers";
import { trpc } from "@/lib/trpc";

export type CurrentAppUser = NonNullable<inferRouterOutputs<AppRouter>["auth"]["me"]>;

type AuthGateProps = {
  children: (user: CurrentAppUser) => ReactNode;
  requireAdmin?: boolean;
  title?: string;
};

export function AuthGate({ children, requireAdmin = false, title = "حسابك" }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const userQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnMount: "always" });
  const [loginError, setLoginError] = useState("");
  const [openingLogin, setOpeningLogin] = useState(false);

  const openLogin = async () => {
    setLoginError("");
    setOpeningLogin(true);
    try {
      await startOAuthLogin();
    } catch {
      setLoginError("تعذر فتح تسجيل الدخول. حاول مرة أخرى.");
    } finally {
      setOpeningLogin(false);
    }
  };

  if (userQuery.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.petrol} size="large" />
          <Text style={styles.muted}>جارٍ التحقق من حسابك…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (userQuery.isError && !userQuery.data) {
    return (
      <ScreenContainer>
        <ScreenHeader title={title} eyebrow="ترحال" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>تعذر التحقق من الحساب</Text>
          <Text style={styles.copy}>تحقق من اتصال الإنترنت بعنوان الخدمة ثم أعد المحاولة.</Text>
          <View style={styles.button}>
            <PrimaryButton title="إعادة المحاولة" onPress={() => void userQuery.refetch()} icon="refresh" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!userQuery.data) {
    return (
      <ScreenContainer>
        <ScreenHeader title={title} eyebrow="ترحال" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>{requireAdmin ? "دخول المشرف" : "سجّل الدخول للمتابعة"}</Text>
          <Text style={styles.copy}>{requireAdmin ? "استخدم حساب Manus المعتمد لإدارة طلبات السائقين." : "يحفظ ترحال الرحلات في حسابك، ويعرض موقع السيارة لصاحب الرحلة فقط."}</Text>
          {loginError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{loginError}</Text> : null}
          <View style={styles.button}>
            {requireAdmin ? (
              <PrimaryButton title={openingLogin ? "جارٍ فتح تسجيل المشرف…" : "دخول المشرف عبر Manus"} onPress={openLogin} icon="login" disabled={openingLogin} />
            ) : (
              <PrimaryButton
                title="تسجيل الدخول بالبريد"
                onPress={() => router.push({ pathname: "/auth", params: { returnTo: pathname } })}
                icon="email"
              />
            )}
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (requireAdmin && userQuery.data.role !== "admin") {
    return (
      <ScreenContainer>
        <ScreenHeader title="صلاحيات المشرف" eyebrow="ترحال" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>هذه الصفحة للمشرف فقط</Text>
          <Text style={styles.copy}>لا يملك هذا الحساب صلاحية اعتماد السائقين.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return <>{children(userQuery.data)}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 24 },
  title: { color: COLORS.ink, fontSize: 21, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  copy: { color: COLORS.muted, fontSize: 13, lineHeight: 21, textAlign: "center", writingDirection: "rtl" },
  muted: { color: COLORS.muted, fontSize: 13, writingDirection: "rtl" },
  error: { color: COLORS.error, fontSize: 12, textAlign: "center", writingDirection: "rtl" },
  button: { width: "100%", marginTop: 4 },
});
