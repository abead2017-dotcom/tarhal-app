import nodemailer, { type Transporter } from "nodemailer";

export type SmtpConfig = { user: string; password: string; from: string };
export function readSmtpConfig(env?: { SMTP_USER?: string; SMTP_PASSWORD?: string; SMTP_FROM?: string }): SmtpConfig {
  const source = env ?? process.env;
  const user = source["SMTP_USER"]?.trim();
  const password = source["SMTP_PASSWORD"];
  const from = source["SMTP_FROM"]?.trim();
  if (!user || !password || !from) throw new Error("SMTP is not configured");
  return { user, password, from };
}

export function createSmtpTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: config.user, pass: config.password },
  });
}

export async function sendEmailOtp(
  recipient: string,
  code: string,
  purpose: "verify" | "reset" | "delete",
): Promise<void> {
  const config = readSmtpConfig();
  const transport = createSmtpTransport(config);
  const labels = {
    verify: "تأكيد البريد الإلكتروني",
    reset: "استعادة كلمة المرور",
    delete: "تأكيد حذف الحساب",
  };
  try {
    await transport.sendMail({
      from: config.from,
      to: recipient,
      subject: `ترحال — ${labels[purpose]}`,
      text: `رمزك: ${code}\nصلاحية الرمز 10 دقائق. إذا لم تطلب ذلك فتجاهل هذه الرسالة.`,
    });
  } catch {
    // Deliberately do not log the provider exception, which may contain PII or credentials.
    throw new Error("Email delivery failed");
  } finally {
    transport.close();
  }
}
