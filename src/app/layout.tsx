import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการผู้สอนกีฬา",
  description: "กรอกตารางเวลาและข้อมูลธุรกรรมของผู้สอนกีฬา",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gradient-to-br from-rose-100 via-white to-blue-100 text-gray-900">
        {children}
      </body>
    </html>
  );
}
