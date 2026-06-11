import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getStudentProfile } from "@/lib/profile-data";
import { EnhancedProfileView } from "@/components/profile/enhanced-profile-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SharedProfilePage({
  params,
}: {
  params: Promise<{ identifier: string }>;
}) {
  const [{ identifier }, viewer] = await Promise.all([params, getCurrentUser()]);
  const profile = await getStudentProfile(identifier, viewer?.id);

  if (!profile) notFound();

  const isOwner = viewer?.id === profile.id;

  return <EnhancedProfileView profile={profile as any} isOwner={isOwner} />;
}
