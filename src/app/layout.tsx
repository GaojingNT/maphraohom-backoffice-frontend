import type { Metadata } from "next";
import { Archivo, Noto_Sans_Thai } from "next/font/google";
import ToastProvider from "@/components/toast-provider";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "มะพร้าวหอม · Backoffice",
  description: "ระบบดูยอดขายและออกบิลมะพร้าวสำหรับเจ้าของร้าน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-frame">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
