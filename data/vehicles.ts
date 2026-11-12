import type { ImageSourcePropType } from "react-native";

export type VehicleId = "economy" | "family" | "4x4" | "van" | "bus";

export type VehicleCategory = {
  id: VehicleId;
  name: string;
  title: string;
  seats: number;
  description: string;
  suitableFor: string;
  features: string[];
  icon: string;
  image: ImageSourcePropType;
};

export const VEHICLES: VehicleCategory[] = [
  {
    id: "economy",
    name: "اقتصادية",
    title: "المركبة الاقتصادية",
    seats: 4,
    description: "خيار عملي للمشاوير اليومية والتنقل الخفيف.",
    suitableFor: "مشاوير المدينة والرحلات القصيرة",
    features: ["مكيّف", "مقاعد مريحة", "حجم مناسب للمدينة"],
    icon: "car-hatchback",
    image: require("../assets/images/vehicle-economic.png"),
  },
  {
    id: "family",
    name: "عائلية",
    title: "المركبة العائلية",
    seats: 6,
    description: "مساحة أوسع للعائلة وأغراض الرحلة.",
    suitableFor: "مشاوير العائلة والتنقل اليومي",
    features: ["مساحة داخلية أوسع", "مقاعد إضافية", "تكييف مريح"],
    icon: "car-estate",
    image: require("../assets/images/vehicle-family.png"),
  },
  {
    id: "4x4",
    name: "دفع رباعي",
    title: "مركبة دفع رباعي",
    seats: 5,
    description: "ثبات ومساحة لرحلات الطرق المتنوعة.",
    suitableFor: "الرحلات الطويلة والطرق المتنوعة",
    features: ["ارتفاع مناسب", "مساحة للأمتعة", "ملائمة للرحلات"],
    icon: "car-lifted-pickup",
    image: require("../assets/images/vehicle-4x4.png"),
  },
  {
    id: "van",
    name: "فان",
    title: "فان للركاب",
    seats: 10,
    description: "يتسع للمجموعات الصغيرة مع مساحة إضافية.",
    suitableFor: "تنقل المجموعات الصغيرة",
    features: ["سعة أكبر", "مساحة للأمتعة", "سهولة الصعود"],
    icon: "van-passenger",
    image: require("../assets/images/vehicle-van.png"),
  },
  {
    id: "bus",
    name: "حافلة",
    title: "حافلة ركاب",
    seats: 30,
    description: "مساحة مناسبة للمجموعات والرحلات المشتركة.",
    suitableFor: "المجموعات والرحلات الجماعية",
    features: ["سعة كبيرة", "مقاعد متعددة", "مناسبة للرحلات الجماعية"],
    icon: "bus-side",
    image: require("../assets/images/vehicle-bus.png"),
  },
];

export function isVehicleId(id: string | undefined): id is VehicleId {
  return VEHICLES.some((vehicle) => vehicle.id === id);
}

export function getVehicle(id: string | undefined) {
  return VEHICLES.find((vehicle) => vehicle.id === id) ?? VEHICLES[0];
}
