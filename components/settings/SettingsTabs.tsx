"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  initialTab = "profile",
}: {
  initialTab?: "profile" | "settings" | "billing";
  profile: React.ReactNode;
  settings: React.ReactNode;
  billing: React.ReactNode;
}) {
  const [tab, setTab] = useState(initialTab);
  const router = useRouter();
  useEffect(() => setTab(initialTab), [initialTab]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (value !== "profile" && value !== "settings" && value !== "billing") return;
        setTab(value);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", value);
        router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
      }}
      className="min-w-0 gap-4"
    >
      <TabsList aria-label="Account settings" className="h-10 w-full max-w-sm rounded-lg border-border bg-transparent p-1">
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
      <TabsContent value="profile" className="min-w-0 space-y-4">
        {profile}
      </TabsContent>
      <TabsContent value="settings" className="min-w-0 space-y-4">
        {settings}
      </TabsContent>
      <TabsContent value="billing" className="min-w-0 space-y-4">
        {billing}
      </TabsContent>
    </Tabs>
  );
}
