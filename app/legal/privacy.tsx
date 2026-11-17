import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { COLORS, ScreenHeader } from "@/components/tarhal-ui";

type PolicySection = {
  title: string;
  body: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

const sections: PolicySection[] = [
  {
    title: "البيانات التي قد نعالجها",
    body: "قد يتطلب إنشاء الحساب والتحقق منه عنوان بريدك الإلكتروني ومعلومات الحساب اللازمة لتشغيل ترحال والتواصل معك بشأنه. تُستخدم بيانات التحقق لإثبات الوصول إلى البريد وإدارة الحساب.",
    icon: "account-outline",
  },
  {
    title: "كلمات المرور وأمان الحساب",
    body: "وفق آلية المصادقة المقصودة للخدمة، تُحفظ كلمات المرور بصيغ مجزأة لا كنصوص مقروءة. لا تُدرج كلمة مرورك في هذه السياسة أو رسائل التحقق. يلزم تأكيد تفاصيل التنفيذ وإجراءات حماية الحساب قبل اعتماد هذه المسودة نهائيًا.",
    icon: "shield-lock-outline",
  },
  {
    title: "الرحلات وموقع السائق",
    body: "قد تُعالج تفاصيل الرحلة، مثل نقاط الانطلاق والوصول وحالة الرحلة، لتنسيق الخدمة وسجل الرحلات. وعند تفعيل خدمة الموقع أثناء رحلة السائق، قد يُجمع موقعه الحالي ويُرسل إلى الخدمة ويُعرض للراكب لمتابعة السيارة. ينبغي أن يقتصر ذلك على الغرض والمدة اللازمين، مع توضيح أذونات الموقع في النظام.",
    icon: "map-marker-path",
  },
  {
    title: "البريد الإلكتروني والتحقق",
    body: "قد يستخدم ترحال Gmail SMTP لإرسال رسائل التحقق المتعلقة بالحساب. يلزم تحديد عنوان الإرسال المعتمد وتأكيد طريقة الإرسال والاحتفاظ بسجلات الرسائل قبل النشر. لا تضع بيانات الدخول أو كلمة مرور التطبيق في هذه الصفحة أو في التطبيق.",
    icon: "email-check-outline",
  },
  {
    title: "الخرائط ومقدمو الخدمات",
    body: "قد تستخدم ميزات الخرائط خدمات Google Maps، وقد يفتح المستخدم الخرائط أو الاتجاهات عبر Apple Maps. عند استخدام هذه الميزات، قد تُرسل بيانات الموقع أو الوجهة اللازمة إلى مزود الخرائط المختار. تخضع معالجة المزود أيضًا لسياساته وشروطه؛ يجب مراجعة تدفق البيانات الفعلي وإعدادات المفاتيح قبل اعتماد النص.",
    icon: "map-outline",
  },
  {
    title: "الاحتفاظ بالبيانات وحذف الحساب",
    body: "تُحتفظ بيانات الحساب والرحلات للمدة اللازمة لتشغيل الخدمة والوفاء بالالتزامات المنطبقة. يمكنك طلب حذف الحساب والبيانات المرتبطة به عبر وسيلة التواصل الموضحة أدناه أو من وسيلة الحذف داخل التطبيق إن توفرت. قد تبقى بعض البيانات عند وجود التزام نظامي أو سبب مشروع للاحتفاظ بها؛ يجب توضيح المدد والاستثناءات وآلية التنفيذ قبل النشر.",
    icon: "delete-outline",
  },
];

export default function PrivacyDraftScreen() {
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScreenHeader title="الخصوصية" eyebrow="ترحال" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <MaterialCommunityIcons name="file-edit-outline" size={22} color={COLORS.petrolDark} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>مسودة للمراجعة — ليست سياسة نهائية</Text>
            <Text style={styles.noticeText}>
              هذا نص أولي يحتاج مراجعة الجهة المسؤولة وتأكيد ممارسات التطبيق والمتطلبات النظامية قبل نشره أو تقديمه للمتاجر.
            </Text>
          </View>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>خصوصيتك في ترحال</Text>
          <Text style={styles.introText}>
            تشرح هذه المسودة أنواع البيانات التي قد تُستخدم عند إنشاء الحساب وطلب الرحلات ومتابعتها، والخدمات الخارجية ذات الصلة.
          </Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderLabel}>الجهة المسؤولة</Text>
            <Text style={styles.placeholderValue}>[أدخل الاسم القانوني للجهة المالكة أو المشغّلة]</Text>
          </View>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderLabel}>التواصل وطلبات الخصوصية والحذف</Text>
            <Text style={styles.placeholderValue}>[أدخل بريد الدعم و/أو رقم الهاتف وعنوان المراسلات]</Text>
          </View>
        </View>

        {sections.map((section, index) => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name={section.icon} size={20} color={COLORS.petrol} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionNumber}>{String(index + 1).padStart(2, "0")}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          يلزم استكمال بيانات الجهة ووسائل التواصل، ومراجعة النص مقابل التنفيذ الفعلي والقوانين وإقرارات المتاجر قبل جعله متاحًا للجمهور.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 34, gap: 13 },
  notice: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.paleAmber,
    borderWidth: 1,
    borderColor: "#F0DDAF",
  },
  noticeCopy: { flex: 1, alignItems: "flex-end", gap: 5 },
  noticeTitle: { color: COLORS.petrolDark, fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  noticeText: { color: COLORS.ink, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  introCard: { gap: 11, padding: 17, borderRadius: 22, backgroundColor: COLORS.petrolDark },
  introTitle: { color: COLORS.white, fontSize: 21, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  introText: { color: "#D7E8E2", fontSize: 12, lineHeight: 20, textAlign: "right", writingDirection: "rtl" },
  placeholder: { alignItems: "flex-end", gap: 4, padding: 11, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)" },
  placeholderLabel: { color: COLORS.white, fontSize: 11, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  placeholderValue: { color: "#F4D99E", fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  sectionCard: {
    gap: 10,
    padding: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
  },
  sectionHeading: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  iconBadge: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paleGreen },
  sectionTitle: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  sectionNumber: { color: COLORS.amber, fontSize: 12, fontWeight: "900" },
  sectionBody: { color: COLORS.muted, fontSize: 12, lineHeight: 21, textAlign: "right", writingDirection: "rtl" },
  footer: { paddingHorizontal: 5, color: COLORS.muted, fontSize: 11, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
});
