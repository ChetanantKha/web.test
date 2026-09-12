import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER!,
        pass: process.env.GMAIL_APP_PASSWORD!,
      },
    });
  }
  return transporter;
}

export type FinishReminderEmailInput = {
  to: string;
  instructorName: string;
  studentName: string | null;
  sessionDateThai: string;
  startTime: string;
  endTime: string;
  courseTypeLabel: string;
  price: number;
  payout: number;
  confirmUrl: string;
};

function renderFinishReminderHtml(input: FinishReminderEmailInput): string {
  const {
    instructorName,
    studentName,
    sessionDateThai,
    startTime,
    endTime,
    courseTypeLabel,
    price,
    payout,
    confirmUrl,
  } = input;

  return `<!doctype html>
<html lang="th">
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#1e293b);padding:20px 24px;">
              <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;">T-STAR ACADEMY</span>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 8px 24px;">
              <p style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#111827;">สวัสดีครับ/ค่ะ คุณ${instructorName}</p>
              <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">คลาสของคุณน่าจะจบแล้ว ช่วยกดยืนยันว่าสอนเสร็จเรียบร้อยด้วยนะครับ</p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:13px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">รายละเอียดคลาส</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1f2937;">
                      <tr><td style="padding:3px 0;color:#6b7280;width:96px;">วันที่</td><td style="padding:3px 0;font-weight:600;">${sessionDateThai}</td></tr>
                      <tr><td style="padding:3px 0;color:#6b7280;">เวลา</td><td style="padding:3px 0;font-weight:600;">${startTime.slice(0, 5)}–${endTime.slice(0, 5)} น.</td></tr>
                      <tr><td style="padding:3px 0;color:#6b7280;">นักเรียน</td><td style="padding:3px 0;font-weight:600;">${studentName ?? "-"}</td></tr>
                      <tr><td style="padding:3px 0;color:#6b7280;">ประเภทคอร์ส</td><td style="padding:3px 0;font-weight:600;">${courseTypeLabel}</td></tr>
                      <tr><td style="padding:3px 0;color:#6b7280;">ราคา</td><td style="padding:3px 0;font-weight:600;">${price.toLocaleString()} บาท</td></tr>
                      <tr><td style="padding:3px 0;color:#6b7280;">ยอดจ่ายผู้สอน</td><td style="padding:3px 0;font-weight:700;color:#c2410c;">${payout.toLocaleString()} บาท</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 24px 8px 24px;">
              <a href="${confirmUrl}"
                 style="display:inline-block;width:100%;box-sizing:border-box;background:linear-gradient(135deg,#f97316,#dc2626);color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;text-align:center;padding:18px 20px;border-radius:14px;">
                ✅ ยืนยันการสอนเสร็จสิ้น
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 28px 24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                ถ้ากดปุ่มด้านบนไม่ได้ ก็อปลิงก์นี้ไปเปิดในเบราว์เซอร์แทนได้เลย:<br>
                <a href="${confirmUrl}" style="color:#2563eb;word-break:break-all;">${confirmUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendFinishReminderEmail(input: FinishReminderEmailInput) {
  const from = process.env.GMAIL_USER;
  if (!from) throw new Error("GMAIL_USER is not set");

  await getTransporter().sendMail({
    from: `T-STAR Academy <${from}>`,
    to: input.to,
    subject: `ยืนยันการสอน — ${input.sessionDateThai} ${input.startTime.slice(0, 5)} น.`,
    html: renderFinishReminderHtml(input),
  });
}
