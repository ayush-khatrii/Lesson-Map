"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Two-tab shell for the settings page. Keeping this as a small client component
 * lets the page itself stay a server component while the sections are passed in
 * as already-rendered slots.
 */
export default function SettingsTabs({
  profile,
  settings,
}: {
  profile: React.ReactNode;
  settings: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="profile" className="gap-6">
      <TabsList className="h-11 w-full max-w-xs">
        <TabsTrigger value="profile" className="text-sm">
          Profile
        </TabsTrigger>
        <TabsTrigger value="settings" className="text-sm">
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="space-y-6">
        {profile}
      </TabsContent>
      <TabsContent value="settings" className="space-y-6">
        {settings}
      </TabsContent>
    </Tabs>
  );
}
