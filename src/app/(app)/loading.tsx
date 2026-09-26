// Skeleton while a server-rendered page loads (spec §7 #8 — pages used to
// stay blank until the whole render finished).
export default function Loading() {
  return (
    <div
      className="flex flex-1 flex-col pb-24"
      aria-busy="true"
      aria-label="กำลังโหลด"
    >
      <div className="mk-header">
        <div className="w-full">
          <div className="mk-skel h-3 w-28" />
          <div className="mk-skel mt-2.5 h-7 w-40" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4">
        <div className="mk-skel h-12 rounded-full!" />
        <div className="mk-kpis">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mk-kpi">
              <div className="mk-skel h-3 w-10" />
              <div className="mk-skel mt-2 h-[18px] w-20" />
            </div>
          ))}
        </div>
        <div className="mk-skel mt-2 h-3.5 w-28" />
        <div className="mk-rows">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="mk-billrow">
              <span className="mk-skel h-9 w-9 flex-none rounded-[10px]!" />
              <span className="mk-billrow__main">
                <span className="mk-skel block h-3 w-[45%]" />
                <span className="mk-skel mt-2 block h-3.5 w-[70%]" />
                <span className="mk-skel mt-2 block h-2.5 w-[85%]" />
              </span>
              <span className="mk-skel h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
