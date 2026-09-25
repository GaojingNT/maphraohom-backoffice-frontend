import Link from "next/link";
import { ChevronLeft, Pencil, Store as StoreIcon } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-ink/13 py-3.5 first:border-t-0 first:pt-0">
      <div className="text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
        {label}
      </div>
      <div className={`mt-1.5 text-[15px] ${value ? "" : "text-ink/40"}`}>
        {value || "—"}
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-1 flex-col pb-28 [animation:riseIn_0.22s_ease_both]">
      <div className="border-b-2 border-divider bg-surface px-5 pt-4 pb-[18px]">
        <Link
          href="/admin"
          className="flex items-center gap-[7px] py-2.5 pr-2.5 text-[13px] font-semibold text-accent"
        >
          <ChevronLeft size={16} />
          กลับ
        </Link>
        <div className="mt-2 text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          โปรไฟล์
        </div>
        <h1 className="mt-2.5 text-[26px] leading-[1.25] font-bold">
          {fullName || profile.email}
        </h1>
      </div>

      <div className="border-b-2 border-divider bg-surface p-5">
        <Field label="ชื่อ" value={profile.firstName} />
        <Field label="นามสกุล" value={profile.lastName} />
        <Field label="อีเมล" value={profile.email} />
        <div className="border-t border-ink/13 pt-3.5">
          <div className="text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            ลายเซ็น
          </div>
          {profile.signature ? (
            // Plain <img> so the preview matches exactly what gets printed on
            // receipts (same element type as bills/export/receipt).
            <img
              src={profile.signature}
              alt="ลายเซ็น"
              className="mt-2.5 h-[90px] w-full border border-divider bg-bg object-contain p-2"
            />
          ) : (
            <div className="mt-1.5 text-[13px] leading-[1.5] text-ink/45">
              ยังไม่มีลายเซ็น — ใบเสร็จที่ส่งออกจะเว้นช่องลายเซ็นว่างไว้
            </div>
          )}
        </div>
      </div>

      <div className="border-b-2 border-divider bg-surface px-5 py-[18px]">
        <div className="mb-2.5 text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
          ร้านที่เป็นเจ้าของ
        </div>
        {profile.stores.length > 0 ? (
          <ul className="flex flex-col">
            {profile.stores.map((store) => (
              <li
                key={store.id}
                className="flex items-center gap-3 border-t border-ink/13 py-2.5 first:border-t-0 first:pt-0"
              >
                {store.logo ? (
                  <div
                    className="h-9 w-9 flex-none border border-divider bg-cover bg-center"
                    style={{ backgroundImage: `url("${store.logo}")` }}
                  />
                ) : (
                  <div className="flex h-9 w-9 flex-none items-center justify-center border border-divider bg-bg text-ink/35">
                    <StoreIcon size={15} strokeWidth={1.6} />
                  </div>
                )}
                <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                  {store.name}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[13px] text-ink/50">ยังไม่ได้เป็นเจ้าของร้านใด</div>
        )}
      </div>

      <div className="px-5 py-3.5">
        <Link
          href="/admin/profile/edit"
          className="flex min-h-[52px] items-center justify-center gap-2 bg-accent px-4 text-[15px] font-semibold text-white"
        >
          แก้ไขโปรไฟล์
          <Pencil size={16} className="ml-auto" />
        </Link>
      </div>
    </div>
  );
}
