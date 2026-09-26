import NotFoundView from "@/components/ui/not-found-view";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh justify-center bg-frame">
      <div className="mk flex min-h-dvh w-full max-w-[430px] flex-col bg-bg">
        <NotFoundView />
      </div>
    </div>
  );
}
