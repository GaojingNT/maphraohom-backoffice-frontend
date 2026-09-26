import Link from "next/link";
import {
  ChevronRight,
  LogOut,
  Store as StoreIcon,
  UserRound,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentProfile } from "@/lib/auth/session";

// Settings landing page — a menu of settings sections. Add more entries here
// as they're built.
export default async function AdminPage() {
  const profile = await getCurrentProfile();
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="mk-header">
        <div>
          <div className="mk-eyebrow">ตั้งค่าร้าน</div>
          <h1 className="mk-h1">จัดการ</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <div className="mk-rows">
          <Link href="/admin/profile" className="mk-menurow">
            <span className="mk-menurow__ic">
              <UserRound />
            </span>
            <span className="mk-menurow__t">
              <b>จัดการโปรไฟล์</b>
              <small className="truncate">
                {fullName ? `${fullName} · ` : ""}ชื่อ อีเมล ลายเซ็น
              </small>
            </span>
            <ChevronRight className="mk-billrow__chev" />
          </Link>
          <Link href="/admin/store" className="mk-menurow">
            <span className="mk-menurow__ic">
              <StoreIcon />
            </span>
            <span className="mk-menurow__t">
              <b>จัดการร้านค้า</b>
              <small>ชื่อ โลโก้ ที่อยู่ เบอร์โทร ของแต่ละร้าน</small>
            </span>
            <ChevronRight className="mk-billrow__chev" />
          </Link>
        </div>

        <form action={signOutAction} className="pt-2">
          <button
            type="submit"
            className="mk-btn mk-btn--outline mk-btn--lg mk-btn--block text-error!"
          >
            <LogOut />
            ออกจากระบบ
          </button>
          <p className="mk-caption mt-2 text-center">
            เข้าสู่ระบบในชื่อ {profile.email}
          </p>
        </form>
      </div>
    </div>
  );
}
