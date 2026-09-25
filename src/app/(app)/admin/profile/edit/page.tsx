import ProfileEditView from "@/components/admin/profile-edit-view";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function ProfileEditPage() {
  const profile = await getCurrentProfile();
  return <ProfileEditView profile={profile} />;
}
