"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Tab shell for the settings page. Keeping this as a small client component
 * lets the page itself stay a server component while the sections are passed in
 * as already-rendered slots.
 */
export default function SettingsTabs({
  profile,
  settings,
  billing,
}: {
  profile: React.ReactNode;
  settings: React.ReactNode;
  billing: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="profile" className="gap-6">
      <TabsList className="h-11 w-full max-w-md">
        <TabsTrigger value="profile" className="text-sm">
          Profile
        </TabsTrigger>
        <TabsTrigger value="settings" className="text-sm">
          Settings
        </TabsTrigger>
        <TabsTrigger value="billing" className="text-sm">
          Billing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="space-y-6">
        {profile}
      </TabsContent>
      <TabsContent value="settings" className="space-y-6">
        {settings}
      </TabsContent>
      <TabsContent value="billing" className="space-y-6">
        {billing}
      </TabsContent>
    </Tabs>
  );
}
