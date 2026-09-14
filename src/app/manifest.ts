import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "T-STAR Academy — ระบบจัดการผู้สอนกีฬา",
    short_name: "T-STAR Academy",
    description: "กรอกตารางเวลาและข้อมูลธุรกรรมของผู้สอนกีฬา",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#152848",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
