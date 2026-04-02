import { AppShell } from "@/components/app-shell";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getChannelsForUser } from "@/lib/channels-for-user";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { channels } = await getChannelsForUser();
  const activeChannelId = channels[0]?.id ?? "c1";

  return (
    <AppShell
      channels={channels}
      activeChannelId={activeChannelId}
      isAuthenticated={!!user}
    >
      <SettingsShell>{children}</SettingsShell>
    </AppShell>
  );
}
