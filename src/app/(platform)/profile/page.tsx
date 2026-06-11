import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getStudentProfile } from "@/lib/profile-data";
import { EnhancedProfileView } from "@/components/profile/enhanced-profile-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const profile = await getStudentProfile(viewer.id, viewer.id);
  if (!profile) redirect("/onboarding");

  return <EnhancedProfileView profile={profile as any} isOwner={true} />;
}

