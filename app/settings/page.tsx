"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ── icon primitives (inline SVG to avoid react-icons dep issues) ──────────────
const Icon = {
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
    </svg>
  ),
  Bell: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9a6 6 0 01-6-6V9a3 3 0 013-3h12a3 3 0 013 3v2a6 6 0 01-6 6zM13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Palette: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="1" fill="currentColor"/>
      <circle cx="8" cy="14" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/>
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <path strokeLinecap="round" d="M1 10h22"/>
    </svg>
  ),
  Link: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Camera: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline strokeLinecap="round" strokeLinejoin="round" points="3 6 5 6 21 6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  ),
  LogOut: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  Copy: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  ),
};

// ── sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { id: "profile",       label: "Profile",       Icon: Icon.User },
  { id: "notifications", label: "Notifications", Icon: Icon.Bell },
  { id: "security",      label: "Security",      Icon: Icon.Shield },
  { id: "appearance",    label: "Appearance",    Icon: Icon.Palette },
  { id: "billing",       label: "Billing",       Icon: Icon.CreditCard },
  { id: "integrations",  label: "Integrations",  Icon: Icon.Link },
];

// ════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ════════════════════════════════════════════════════════════════════════════
function ProfileTab() {
  const [name, setName]   = useState("Alex Rivera");
  const [bio, setBio]     = useState("Educator & course designer. Building structured learning journeys for modern teams.");
  const [handle, setHandle] = useState("alexrivera");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Profile Photo</CardTitle>
          <CardDescription>This is shown on your public course maps and profile page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar className="w-20 h-20 border-2 border-border">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">AR</AvatarFallback>
              </Avatar>
              <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Icon.Camera />
              </button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm">Upload Photo</Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF · Max 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Basic Information</CardTitle>
          <CardDescription>Used on your public profile and course pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="handle">Username</Label>
              <div className="flex">
                <span className="flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                  lessonmap.app/
                </span>
                <Input id="handle" value={handle} onChange={e => setHandle(e.target.value)}
                  className="rounded-l-none" placeholder="username" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="alex@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role / Title</Label>
              <Input id="role" defaultValue="Educator & Content Creator" placeholder="e.g. Instructor, L&D Lead" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)}
              rows={3} placeholder="Tell the world what you teach..." className="resize-none" />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://yoursite.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="ist">
                <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ist">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">America/New_York (EST)</SelectItem>
                  <SelectItem value="pst">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="gmt">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats strip */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-3 divide-x divide-border text-center">
            {[["12","Courses"],["3.4k","Students"],["48","Lessons"]].map(([v,l])=>(
              <div key={l} className="px-4">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2 min-w-[120px]">
          {saved ? <><Icon.Check /> Saved</> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS TAB
// ════════════════════════════════════════════════════════════════════════════
const notifGroups = [
  {
    group: "Activity",
    items: [
      { id:"n1", label:"New student enrolled in a course", desc:"When someone joins one of your published courses." },
      { id:"n2", label:"Course comment or reaction",       desc:"When a student reacts to or comments on a lesson." },
      { id:"n3", label:"Course outline shared",           desc:"When someone views your public course map." },
    ]
  },
  {
    group: "AI & Product",
    items: [
      { id:"n4", label:"AI generation complete",           desc:"When your AI-assisted outline finishes generating." },
      { id:"n5", label:"New features & product updates",   desc:"Occasional announcements about new LessonMap features." },
      { id:"n6", label:"Weekly digest",                    desc:"A summary of your course activity every Monday." },
    ]
  },
  {
    group: "Account",
    items: [
      { id:"n7", label:"Security alerts",                  desc:"Sign-ins from new devices or suspicious activity." },
      { id:"n8", label:"Billing & payment receipts",       desc:"Receipts and renewal reminders." },
    ]
  },
];

function NotificationsTab() {
  const [states, setStates] = useState<Record<string,boolean>>({n1:true,n2:true,n3:false,n4:true,n5:false,n6:true,n7:true,n8:true});
  const toggle = (id:string) => setStates(s=>({...s,[id]:!s[id]}));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription>Choose what you want to be notified about via email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notifGroups.map(g=>(
            <div key={g.group}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{g.group}</p>
              <div className="space-y-1">
                {g.items.map((item,i)=>(
                  <div key={item.id}>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <Switch checked={states[item.id]} onCheckedChange={()=>toggle(item.id)} />
                    </div>
                    {i < g.items.length-1 && <Separator />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Frequency</CardTitle>
          <CardDescription>Control how often we batch and send emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select defaultValue="instant">
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant (as they happen)</SelectItem>
              <SelectItem value="daily">Daily digest</SelectItem>
              <SelectItem value="weekly">Weekly digest</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECURITY TAB
// ════════════════════════════════════════════════════════════════════════════
function SecurityTab() {
  const sessions = [
    { device:"Chrome on macOS",     location:"Mumbai, IN",      time:"Active now",     current:true },
    { device:"Safari on iPhone 15", location:"Mumbai, IN",      time:"2 hours ago",    current:false },
    { device:"Firefox on Windows",  location:"Bengaluru, IN",   time:"3 days ago",     current:false },
  ];

  return (
    <div className="space-y-6">
      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Use a strong, unique password for your LessonMap account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <Input type="password" placeholder="••••••••" className="max-w-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" placeholder="••••••••" className="max-w-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input type="password" placeholder="••••••••" className="max-w-sm" />
          </div>
          <Button size="sm">Update Password</Button>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Authenticator App</p>
              <p className="text-xs text-muted-foreground">Use an app like Google Authenticator or Authy.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs text-muted-foreground">Not enabled</Badge>
              <Button size="sm" variant="outline">Enable</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Sessions</CardTitle>
          <CardDescription>Devices currently signed into your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((s,i)=>(
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${s.current?"bg-green-500":"bg-muted-foreground/30"}`} />
                <div>
                  <p className="text-sm font-medium">{s.device}</p>
                  <p className="text-xs text-muted-foreground">{s.location} · {s.time}</p>
                </div>
              </div>
              {s.current
                ? <Badge variant="secondary" className="text-xs">This device</Badge>
                : <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs h-7">Revoke</Button>
              }
            </div>
          ))}
          <Separator />
          <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
            Sign out all other sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// APPEARANCE TAB
// ════════════════════════════════════════════════════════════════════════════
function AppearanceTab() {
  const [theme, setTheme] = useState<"light"|"dark"|"system">("system");
  const [accent, setAccent] = useState("default");
  const [density, setDensity] = useState("comfortable");

  const accents = [
    { id:"default", color:"hsl(222.2 47.4% 11.2%)", label:"Slate" },
    { id:"blue",    color:"#2563eb",                 label:"Blue" },
    { id:"violet",  color:"#7c3aed",                 label:"Violet" },
    { id:"rose",    color:"#e11d48",                 label:"Rose" },
    { id:"orange",  color:"#ea580c",                 label:"Orange" },
    { id:"teal",    color:"#0d9488",                 label:"Teal" },
  ];

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>Choose how LessonMap looks for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {(["light","dark","system"] as const).map(t=>(
              <button key={t} onClick={()=>setTheme(t)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme===t?"border-primary bg-primary/5":"border-border hover:border-muted-foreground/40"}`}>
                <div className={`w-full h-10 rounded-md ${t==="light"?"bg-white border border-border":t==="dark"?"bg-zinc-900":
                  "bg-gradient-to-r from-white to-zinc-900"}`} />
                <span className="text-xs font-medium capitalize">{t}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accent Color</CardTitle>
          <CardDescription>Personalize the primary color used across your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {accents.map(a=>(
              <button key={a.id} onClick={()=>setAccent(a.id)} title={a.label}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${accent===a.id?"border-foreground scale-110":"border-transparent hover:border-muted-foreground/50"}`}
                style={{backgroundColor:a.color}}>
                {accent===a.id && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Density */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interface Density</CardTitle>
          <CardDescription>How compact or spacious the UI elements appear.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {["compact","comfortable","spacious"].map(d=>(
              <button key={d} onClick={()=>setDensity(d)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize ${density===d?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground hover:border-muted-foreground/60"}`}>
                {d}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Apply Settings</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BILLING TAB
// ════════════════════════════════════════════════════════════════════════════
function BillingTab() {
  const invoices = [
    { date:"May 1, 2026",  amount:"$12.00", status:"Paid" },
    { date:"Apr 1, 2026",  amount:"$12.00", status:"Paid" },
    { date:"Mar 1, 2026",  amount:"$12.00", status:"Paid" },
  ];

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Pro Plan
                <Badge className="text-xs">Active</Badge>
              </CardTitle>
              <CardDescription className="mt-1">$12/month · Renews June 1, 2026</CardDescription>
            </div>
            <Button variant="outline" size="sm">Manage Plan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Courses used</span>
              <span className="font-medium">12 / unlimited</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">AI generations this month</span>
              <span className="font-medium">38 / 100</span>
            </div>
            <Progress value={38} className="h-1.5" />
            <p className="text-xs text-muted-foreground">62 AI generations remaining this billing cycle</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded bg-muted border border-border flex items-center justify-center text-xs font-bold">VISA</div>
              <div>
                <p className="text-sm font-medium">Visa ending in 4242</p>
                <p className="text-xs text-muted-foreground">Expires 08 / 27</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.map((inv,i)=>(
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{inv.date}</p>
                  <p className="text-xs text-muted-foreground">Pro Plan — Monthly</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{inv.amount}</span>
                  <Badge variant="secondary" className="text-xs">{inv.status}</Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">Download</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS TAB
// ════════════════════════════════════════════════════════════════════════════
const integrations = [
  { name:"Notion",     desc:"Sync course outlines as Notion pages automatically.",   connected:true,  logo:"N" },
  { name:"Google Drive",desc:"Export PDFs and outlines directly to your Drive.",     connected:true,  logo:"G" },
  { name:"Gumroad",    desc:"Push your course outline as a draft product page.",     connected:false, logo:"GR" },
  { name:"Teachable",  desc:"Import your Teachable course structure into LessonMap.",connected:false, logo:"T" },
  { name:"Zapier",     desc:"Automate workflows with 5,000+ apps via Zapier.",       connected:false, logo:"Z" },
  { name:"Slack",      desc:"Get course activity notifications in your Slack.",      connected:false, logo:"S" },
];

function IntegrationsTab() {
  const [states, setStates] = useState<Record<string,boolean>>(
    Object.fromEntries(integrations.map(i=>[i.name, i.connected]))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Apps</CardTitle>
          <CardDescription>Connect LessonMap with your favourite tools and platforms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {integrations.map((intg,i)=>(
            <div key={intg.name}>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg border border-border bg-muted flex items-center justify-center text-xs font-bold">
                    {intg.logo}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{intg.name}</p>
                    <p className="text-xs text-muted-foreground max-w-xs">{intg.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {states[intg.name] && <Badge variant="secondary" className="text-xs">Connected</Badge>}
                  <Button size="sm" variant={states[intg.name]?"outline":"default"}
                    onClick={()=>setStates(s=>({...s,[intg.name]:!s[intg.name]}))}
                    className={states[intg.name]?"text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive":""}>
                    {states[intg.name]?"Disconnect":"Connect"}
                  </Button>
                </div>
              </div>
              {i < integrations.length-1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Access</CardTitle>
          <CardDescription>Use the LessonMap API to build custom integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value="lm_sk_••••••••••••••••••••••••••••••••" className="font-mono text-sm" />
            <Button variant="outline" size="icon" className="flex-shrink-0"><Icon.Copy /></Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Regenerate Key</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">View API Docs →</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DANGER ZONE (shared footer across all tabs — rendered inside Security)
// ════════════════════════════════════════════════════════════════════════════
function DangerZone() {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Export all data</p>
            <p className="text-xs text-muted-foreground">Download all your courses, outlines, and account data.</p>
          </div>
          <Button variant="outline" size="sm">Export</Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5"><Icon.Trash /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your LessonMap account, all courses, outlines, and content. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Yes, delete my account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const [active, setActive] = useState("profile");

  const content: Record<string, React.ReactNode> = {
    profile:       <><ProfileTab /></>,
    notifications: <NotificationsTab />,
    security:      <><SecurityTab /><div className="mt-6"><DangerZone /></div></>,
    appearance:    <AppearanceTab />,
    billing:       <BillingTab />,
    integrations:  <IntegrationsTab />,
  };

  const titles: Record<string,{title:string;desc:string}> = {
    profile:       { title:"Profile",       desc:"Manage your public presence and personal information." },
    notifications: { title:"Notifications", desc:"Control which emails and alerts you receive from LessonMap." },
    security:      { title:"Security",      desc:"Keep your account safe with a strong password and 2FA." },
    appearance:    { title:"Appearance",    desc:"Customize how LessonMap looks and feels for you." },
    billing:       { title:"Billing",       desc:"Manage your subscription, payment method, and invoices." },
    integrations:  { title:"Integrations",  desc:"Connect LessonMap with your favorite tools and platforms." },
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto h-14 w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="hsl(var(--primary-foreground))" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="hsl(var(--primary-foreground))" opacity=".6" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="hsl(var(--primary-foreground))" opacity=".6" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="hsl(var(--primary-foreground))" opacity=".3" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight">LessonMap</span>
            <span className="text-muted-foreground/40 mx-1">/</span>
            <span className="text-sm text-muted-foreground">Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs">
              <Icon.LogOut /> Sign Out
            </Button>
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">AR</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Mobile: tabs at top */}
        <div className="md:hidden mb-6">
          <Tabs value={active} onValueChange={setActive}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-xl">
              {NAV.map(n=>(
                <TabsTrigger key={n.id} value={n.id} className="text-xs rounded-lg">{n.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col w-52 flex-shrink-0">
            {/* Mini profile card */}
            <div className="flex flex-col items-center text-center p-4 mb-4 rounded-xl bg-muted/40 border border-border">
              <Avatar className="w-12 h-12 mb-2">
                <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">AR</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold">Alex Rivera</p>
              <p className="text-xs text-muted-foreground">Pro Plan</p>
            </div>

            <nav className="space-y-0.5">
              {NAV.map(n=>(
                <button key={n.id} onClick={()=>setActive(n.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                    active===n.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}>
                  <n.Icon />
                  {n.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6">
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                <Icon.LogOut />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{titles[active].title}</h1>
              <p className="text-muted-foreground text-sm mt-1">{titles[active].desc}</p>
            </div>
            {content[active]}
          </main>
        </div>
      </div>
    </div>
  );
}
