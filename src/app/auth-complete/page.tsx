import { AuthRedirect } from "@/components/auth-redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AuthCompletePage() {
  return <AuthRedirect />;
}
