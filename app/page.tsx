import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/constants";

export default async function RootPage() {
  const { userId } = await auth();
  // New visitors land on sign-up first (most people reaching the portal for the
  // first time need an account); the sign-up screen links to sign-in for
  // returning students.
  if (!userId) redirect(ROUTES.signUp);

  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.unauthorized);
  if (user.profile.onboarding_status !== "completed") redirect(ROUTES.onboarding);
  redirect(ROUTES.dashboard);
}
