import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This route handles /@username format and redirects to /u/username
export default async function AtUsernameRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  
  // Redirect to the actual profile page without the @ symbol
  redirect(`/u/${username}`);
}
