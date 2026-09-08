import type { Metadata } from "next";
import { Archivo, Noto_Sans_Thai } from "next/font/google";
import BottomNav from "@/components/bottom-nav";
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
        <ToastProvider>
          <div className="flex min-h-dvh justify-center bg-frame">
            <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-bg shadow-[0_0_0_1px_rgba(22,33,26,0.10)]">
              {children}
            </div>
          </div>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
