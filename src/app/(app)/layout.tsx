import BottomNav from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex min-h-dvh justify-center bg-frame">
        <div className="mk relative flex min-h-dvh w-full max-w-[430px] flex-col bg-bg shadow-[0_0_0_1px_rgba(31,26,20,0.06)]">
          {children}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
