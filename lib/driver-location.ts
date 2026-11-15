import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import superjson from "superjson";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import type { AppRouter } from "@/server/routers";

export const DRIVER_LOCATION_TASK = "tarhal-driver-location-v1";
const ACTIVE_RIDE_KEY = "tarhal-active-ride-id";

type LocationTaskPayload = { locations?: Location.LocationObject[] };

async function sendLocation(rideId: number, point: Location.LocationObject) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error("عنوان خادم ترحال غير مهيأ لهذا الجهاز.");
  const token = await Auth.getSessionToken();
  if (!token) throw new Error("انتهت جلسة السائق؛ سجّل الدخول مجددًا.");

  const client = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${apiBaseUrl.replace(/\/$/, "")}/api/trpc`,
        transformer: superjson,
        headers: () => ({ Authorization: `Bearer ${token}` }),
      }),
    ],
  });

  await client.driver.updateLocation.mutate({
    rideId,
    latitude: point.coords.latitude,
    longitude: point.coords.longitude,
    accuracy: point.coords.accuracy ?? undefined,
    heading: point.coords.heading ?? undefined,
    speed: point.coords.speed ?? undefined,
    recordedAt: new Date(point.timestamp),
  });
}

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskPayload>(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    try {
      const rideIdText = await SecureStore.getItemAsync(ACTIVE_RIDE_KEY);
      const rideId = Number(rideIdText);
      if (!Number.isSafeInteger(rideId) || rideId <= 0) return;
      const latestPoint = data.locations.reduce((latest, point) =>
        point.timestamp > latest.timestamp ? point : latest,
      );
      if (latestPoint) await sendLocation(rideId, latestPoint);
    } catch (taskError) {
      console.warn("[LocationTask] Location update could not be sent", taskError instanceof Error ? taskError.message : "unknown error");
    }
  });
}

export async function requestDriverLocationPermissions() {
  if (Platform.OS === "web") throw new Error("تتبّع الخلفية متاح داخل تطبيق الهاتف فقط.");
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) throw new Error("فعّل خدمات الموقع في إعدادات الهاتف ثم أعد المحاولة.");

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") throw new Error("نحتاج إذن الموقع أثناء استخدام التطبيق لبدء الرحلة.");

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") throw new Error("نحتاج إذن الموقع في الخلفية كي يظل الراكب يرى السيارة أثناء استخدامك تطبيقًا آخر.");
  await Auth.prepareSessionTokenForBackground();
}

export async function startDriverLocationTracking(rideId: number) {
  if (Platform.OS === "web") throw new Error("تتبّع الخلفية متاح داخل تطبيق الهاتف فقط.");
  if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) throw new Error("مهمة الموقع غير محملة؛ أعد فتح تطبيق ترحال.");
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error("عنوان خادم ترحال غير مهيأ لهذا الجهاز.");

  await SecureStore.setItemAsync(ACTIVE_RIDE_KEY, String(rideId), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5_000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "ترحال · مشاركة موقع الرحلة",
        notificationBody: "يشارك هاتفك موقع السيارة مع الراكب حتى نهاية الرحلة.",
        notificationColor: "#126B61",
        killServiceOnDestroy: true,
      },
    });
  }

  const firstPoint = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await sendLocation(rideId, firstPoint);
}

export async function stopDriverLocationTracking() {
  if (Platform.OS !== "web" && TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
    const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false);
    if (started) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => undefined);
    await SecureStore.deleteItemAsync(ACTIVE_RIDE_KEY).catch(() => undefined);
  }
}
