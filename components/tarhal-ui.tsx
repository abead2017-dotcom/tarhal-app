import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const COLORS = {
  ink: "#173A36",
  petrol: "#126B61",
  petrolDark: "#0E514A",
  amber: "#E6A746",
  cream: "#F7F4EC",
  white: "#FFFFFF",
  card: "#FFFEFA",
  muted: "#6D7E78",
  line: "#E6E3D9",
  paleGreen: "#E7F1ED",
  paleAmber: "#FBF0D9",
  error: "#B54C40",
};

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size / 2 }]}>
      <MaterialIcons name="alt-route" size={size * 0.56} color={COLORS.white} />
      <View style={[styles.brandDot, { width: size * 0.17, height: size * 0.17 }]} />
    </View>
  );
}

export function ScreenHeader({
  title,
  eyebrow,
  onBack,
}: {
  title: string;
  eyebrow?: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.screenHeader}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backButton}>
        <MaterialIcons name="arrow-forward" size={23} color={COLORS.ink} />
      </Pressable>
      <View style={styles.headerTitles}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      <BrandMark size={38} />
    </View>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  icon = "arrow-back",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
      <MaterialIcons name={icon} size={20} color={COLORS.white} />
    </Pressable>
  );
}

export function Tag({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" }) {
  return (
    <View style={[styles.tag, tone === "amber" ? styles.tagAmber : styles.tagGreen]}>
      {children}
    </View>
  );
}

export function RouteLine({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.routeLine, compact && styles.routeLineCompact]}>
      <View style={[styles.routeDot, styles.routeStart]} />
      <View style={styles.routeDash} />
      <View style={[styles.routeDot, styles.routeEnd]} />
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    backgroundColor: COLORS.petrol,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: COLORS.petrolDark,
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  brandDot: {
    backgroundColor: COLORS.amber,
    borderRadius: 20,
    position: "absolute",
    top: "18%",
    right: "19%",
    borderWidth: 1.5,
    borderColor: COLORS.petrol,
  },
  screenHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  headerTitles: { flex: 1, alignItems: "flex-end", gap: 2 },
  eyebrow: { color: COLORS.muted, fontSize: 11, writingDirection: "rtl" },
  screenTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", writingDirection: "rtl" },
  sectionHeading: { gap: 4, alignItems: "flex-end" },
  sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: "800", writingDirection: "rtl" },
  sectionSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 20, writingDirection: "rtl", textAlign: "right" },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: COLORS.petrol,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    shadowColor: COLORS.petrolDark,
    shadowOpacity: 0.17,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: COLORS.white, fontSize: 15, fontWeight: "800", writingDirection: "rtl" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  tag: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, alignSelf: "flex-start" },
  tagGreen: { backgroundColor: COLORS.paleGreen },
  tagAmber: { backgroundColor: COLORS.paleAmber },
  routeLine: { height: 18, flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  routeLineCompact: { height: 14, gap: 4 },
  routeDot: { width: 9, height: 9, borderRadius: 5 },
  routeStart: { backgroundColor: COLORS.petrol },
  routeEnd: { backgroundColor: COLORS.amber },
  routeDash: { width: 30, borderTopWidth: 1.5, borderColor: COLORS.petrol, borderStyle: "dashed" },
});
