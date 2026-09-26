import Link from "next/link";
import { Pencil, Store as StoreIcon } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import TopBar, { PageHeading } from "@/components/ui/top-bar";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopBar backHref="/admin" />
      <div className="flex flex-col gap-4 px-4">
        <PageHeading eyebrow="โปรไฟล์" title={fullName || profile.email} />

        <div className="mk-card px-4 py-1.5">
          <dl className="mk-dl">
            <div>
              <dt>ชื่อ</dt>
              <dd>{profile.firstName || "—"}</dd>
            </div>
            <div>
              <dt>นามสกุล</dt>
              <dd>{profile.lastName || "—"}</dd>
            </div>
            <div>
              <dt>อีเมล</dt>
              <dd className="break-all">{profile.email || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="mk-card mk-card__pad">
          <h2 className="mk-title mb-2.5">ลายเซ็น</h2>
          {profile.signature ? (
            <div className="mk-sig">
              {/* Plain <img> so the preview matches exactly what gets printed
                  on receipts (same element type as bills/export/receipt). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.signature} alt="ลายเซ็น" />
            </div>
          ) : (
            <p className="text-[14px] text-ink-muted">
              ยังไม่มีลายเซ็น — ใบเสร็จที่ส่งออกจะเว้นช่องลายเซ็นว่างไว้
            </p>
          )}
        </div>

        <div className="mk-card mk-card__pad">
          <h2 className="mk-title mb-2.5">ร้านที่เป็นเจ้าของ</h2>
          {profile.stores.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {profile.stores.map((store) => (
                <li key={store.id} className="flex items-center gap-3">
                  <span className="mk-logotile">
                    {store.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo} alt="" />
                    ) : (
                      <StoreIcon />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {store.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-muted">
              ยังไม่ได้เป็นเจ้าของร้านใด
            </p>
          )}
        </div>

        <Link
          href="/admin/profile/edit"
          className="mk-btn mk-btn--primary mk-btn--lg mk-btn--block"
        >
          แก้ไขโปรไฟล์
          <Pencil />
        </Link>
      </div>
    </div>
  );
}
