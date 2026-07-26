import { redirect } from "next/navigation";
import { MaintenanceScreen } from "@/components/dashboard/MaintenanceScreen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const previewParam = (await searchParams).preview;
  const previewRequested = Array.isArray(previewParam)
    ? previewParam[0] === "1"
    : previewParam === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/maintenance");

  const [{ data: profile }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, language, maintenance_access")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("get_public_system_settings"),
  ]);
  const settings = Array.isArray(settingsRows) ? settingsRows[0] : settingsRows;
  const hasBypass =
    profile?.role === "admin" ||
    profile?.role === "super_admin" ||
    profile?.maintenance_access === true;
  const canPreview =
    previewRequested &&
    (profile?.role === "admin" || profile?.role === "super_admin");

  if (!settings?.maintenance_mode || (hasBypass && !canPreview)) {
    redirect("/dashboard");
  }

  return (
    <MaintenanceScreen
      userLanguage={profile?.language || "en"}
      content={settings.maintenance_content || null}
    />
  );
}
