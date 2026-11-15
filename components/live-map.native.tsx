import MapView, { Marker, type Region } from "react-native-maps";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

export type LiveMapLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string | Date;
};

export function LiveMap({ location }: { location: LiveMapLocation }) {
  const map = useRef<MapView | null>(null);
  const region = useMemo<Region>(
    () => ({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }),
    [location.latitude, location.longitude],
  );

  useEffect(() => {
    map.current?.animateToRegion(region, 450);
  }, [region]);

  return (
    <View style={styles.container}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={region} showsCompass>
        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="مركبة ترحال" description="الموقع المرسل من هاتف السائق" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 340, overflow: "hidden", borderRadius: 24, backgroundColor: "#E8EFE9" },
});
