import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getStudentProfile } from "@/lib/profile-data";
import { ProfileSyncWrapper } from "@/components/profile/profile-sync-wrapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const profile = await getStudentProfile(viewer.id, viewer.id);
  if (!profile) redirect("/onboarding");

  return <ProfileSyncWrapper initialProfile={profile} viewerId={viewer.id} />;
}
