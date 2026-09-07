import { redirect } from "next/navigation";

import { saveProfile } from "@/app/(app)/profile-actions";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentProfile } from "@/lib/profile";

type SettingsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  const { message } = await searchParams;

  return <ProfileForm action={saveProfile} message={message} mode="settings" profile={profile} />;
}
