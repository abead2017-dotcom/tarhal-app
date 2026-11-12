import { Image, StyleSheet, View } from "react-native";

import type { VehicleCategory } from "@/data/vehicles";

export function VehicleVisual({
  vehicle,
  size = "card",
}: {
  vehicle: VehicleCategory;
  size?: "card" | "hero" | "thumbnail";
}) {
  const boxStyle = size === "hero" ? styles.hero : size === "thumbnail" ? styles.thumbnail : styles.card;

  return (
    <View style={[styles.box, boxStyle]}>
      <Image
        source={vehicle.image}
        resizeMode="contain"
        style={styles.image}
        accessibilityLabel={vehicle.title}
      />
      <View style={styles.illustrationHalo} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF3EE",
    overflow: "hidden",
    position: "relative",
  },
  hero: { height: 230, borderRadius: 28, marginHorizontal: 22 },
  card: { height: 166, borderRadius: 22 },
  thumbnail: { width: 60, height: 60, borderRadius: 18 },
  image: { width: "88%", height: "82%", zIndex: 1 },
  illustrationHalo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 80,
    right: -76,
    bottom: -88,
    backgroundColor: "rgba(18, 107, 97, 0.055)",
  },
});
