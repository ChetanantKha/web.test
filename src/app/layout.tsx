import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการผู้สอนกีฬา",
  description: "กรอกตารางเวลาและข้อมูลธุรกรรมของผู้สอนกีฬา",
  appleWebApp: {
    capable: true,
    title: "T-STAR Academy",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#152848",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gradient-to-br from-orange-50 via-white to-blue-50 text-gray-900">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
