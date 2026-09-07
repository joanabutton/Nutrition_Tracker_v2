import { redirect } from "next/navigation";

import { saveProfile } from "@/app/(app)/profile-actions";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentProfile } from "@/lib/profile";

type OnboardingPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect("/today");
  }

  const { message } = await searchParams;

  return <ProfileForm action={saveProfile} message={message} mode="onboarding" />;
}
