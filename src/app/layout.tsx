import type { Metadata } from "next";
import { Kanit, Sarabun } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500", "700", "800"],
  variable: "--font-kanit",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: {
    default: "Steakboss สเต็กปรุงสำเร็จ — ส่งรถเย็นถึงบ้าน",
    template: "%s | Steakboss",
  },
  description:
    "สเต็กหมักปรุงสำเร็จแช่แข็ง -18°C หมู ไก่ อกไก่คลีน หมักพริกไทยดำสูตรต้นตำรับ ผลิตโดย บริษัท สเต็กบอสส์ต้นตำรับ จำกัด จ.อ่างทอง ส่งรถเย็นทั่วประเทศ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${kanit.variable} ${sarabun.variable}`}>
      <body className="font-sans antialiased min-h-screen">{children}</body>
    </html>
  );
}
