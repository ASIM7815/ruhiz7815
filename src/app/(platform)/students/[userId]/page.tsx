import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getStudentProfile } from "@/lib/profile-data";
import { StudentProfileView } from "@/components/profile/student-profile-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicStudentPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const [{ userId }, viewer] = await Promise.all([params, getCurrentUser()]);
  const profile = await getStudentProfile(userId, viewer?.id);

  if (!profile) notFound();

  return <StudentProfileView profile={profile} viewerId={viewer?.id} />;
}
