import BottomNav from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex min-h-dvh justify-center bg-frame">
        <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-bg shadow-[0_0_0_1px_rgba(22,33,26,0.10)]">
          {children}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
