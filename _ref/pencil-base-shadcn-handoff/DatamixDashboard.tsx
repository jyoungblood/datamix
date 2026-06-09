"use client";

import * as React from "react";
import {
  Blocks,
  Database,
  FileText,
  Image,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Screen =
  | "schema"
  | "schema-builder"
  | "content"
  | "media"
  | "team"
  | "settings"
  | "user-settings";

const navItems = [
  { id: "schema" as const, label: "Schema", icon: Database },
  { id: "content" as const, label: "Content", icon: FileText },
  { id: "media" as const, label: "Media", icon: Image },
  { id: "team" as const, label: "Team", icon: Users },
  { id: "settings" as const, label: "Settings", icon: SlidersHorizontal },
];

export function DatamixDashboard() {
  const [screen, setScreen] = React.useState<Screen>("schema");

  return (
    <div className="flex min-h-screen bg-[var(--background)] font-body text-[var(--foreground)]">
      <DatamixSidebar active={screen} onNavigate={setScreen} />
      <main className="flex-1 bg-[var(--muted)] p-6">
        {screen === "schema" && <SchemaOverview onOpenBuilder={() => setScreen("schema-builder")} />}
        {screen === "schema-builder" && <SchemaBuilder />}
        {screen === "content" && <ContentEditor />}
        {screen === "media" && <MediaLibrary />}
        {screen === "team" && <TeamRoles />}
        {screen === "settings" && <SettingsApiKeys />}
        {screen === "user-settings" && <UserSettings />}
      </main>
    </div>
  );
}

function DatamixSidebar({
  active,
  onNavigate,
}: {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <aside className="flex min-h-screen w-[176px] shrink-0 flex-col bg-[var(--sidebar)] px-4 py-[18px] text-[var(--sidebar-foreground)]">
      <button
        className="mb-8 flex items-center gap-2.5 text-left"
        onClick={() => onNavigate("schema")}
        type="button"
      >
        <span className="flex h-[27px] w-[27px] items-center justify-center rounded-md bg-[var(--primary)]">
          <Blocks className="h-4 w-4 text-blue-100" />
        </span>
        <span className="font-heading text-sm font-extrabold tracking-wide text-white">DATAMIX</span>
      </button>

      <nav className="space-y-3">
        {navItems.map((item) => {
          const isActive =
            active === item.id ||
            (item.id === "schema" && active === "schema-builder");
          const Icon = item.icon;

          return (
            <button
              className={[
                "flex h-[34px] w-full items-center gap-2.5 rounded-[7px] px-2.5 text-left text-xs transition",
                isActive
                  ? "border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)] font-bold text-white"
                  : "border border-transparent text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]",
              ].join(" ")}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              {isActive && <span className="h-[18px] w-[3px] rounded-full bg-[var(--primary)]" />}
              <Icon className={isActive ? "h-[15px] w-[15px] text-blue-400" : "h-[15px] w-[15px] text-slate-400"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        className="mt-auto flex h-14 w-full items-center gap-2.5 rounded-[9px] border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)] px-2.5 text-left"
        onClick={() => onNavigate("user-settings")}
        type="button"
      >
        <Avatar className="h-[30px] w-[30px] bg-[var(--primary)]">
          <AvatarFallback className="bg-[var(--primary)] text-[10px] font-bold text-white">MC</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-bold text-white">Maya Chen</span>
          <span className="block truncate text-[7px] text-slate-400">maya@datamix.io / Admin</span>
        </span>
      </button>
    </aside>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="font-data text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{eyebrow}</p>
        <h1 className="font-heading text-[28px] font-extrabold leading-tight text-slate-950">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {action}
    </header>
  );
}

function SchemaOverview({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  return (
    <section>
      <PageHeader
        action={<Button onClick={onOpenBuilder}>New schema</Button>}
        description="Manage schema definitions, fields, records, and publishing status."
        eyebrow="Schema"
        title="Schema"
      />
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Schemas" value="4" />
        <Metric label="Records" value="26" />
        <Metric label="Drafts" value="3" />
      </div>
      <Card className="mt-4 overflow-hidden rounded-lg border-[var(--border)] shadow-none">
        <div className="grid grid-cols-4 border-b bg-white px-4 py-3 text-[11px] font-bold text-slate-500">
          <span>Schema</span>
          <span>Fields</span>
          <span>Records</span>
          <span>Status</span>
        </div>
        {[
          ["articles", "3 fields", "1 record", "Live"],
          ["authors", "5 fields", "8 records", "Live"],
          ["assets", "System", "12 files", "Ready"],
          ["settings", "Admin", "Private", "Locked"],
        ].map((row) => (
          <div className="grid grid-cols-4 border-b px-4 py-3 text-xs last:border-b-0" key={row[0]}>
            <span className="font-medium text-slate-950">{row[0]}</span>
            <span className="text-slate-500">{row[1]}</span>
            <span className="text-slate-500">{row[2]}</span>
            <span className="text-slate-500">{row[3]}</span>
          </div>
        ))}
      </Card>
    </section>
  );
}

function SchemaBuilder() {
  const fields = [
    ["Title", "text · Required", true],
    ["Body", "markdown · Optional", false],
    ["Publish date", "date · Optional", false],
  ] as const;

  return (
    <section>
      <PageHeader
        action={<Button>Save schema</Button>}
        description="Edit fields in a focused builder before opening records."
        eyebrow="Schema"
        title="articles schema"
      />
      <div className="grid grid-cols-[250px_1fr] gap-4">
        <div className="space-y-2.5">
          {fields.map(([name, meta, active]) => (
            <button
              className={[
                "w-full rounded-lg border p-3 text-left",
                active ? "border-slate-950 bg-slate-950 text-white" : "border-[var(--border)] bg-white text-slate-950",
              ].join(" ")}
              key={name}
              type="button"
            >
              <span className="block text-sm font-semibold">{name}</span>
              <span className={active ? "text-[10px] text-slate-300" : "text-[10px] text-slate-500"}>{meta}</span>
            </button>
          ))}
        </div>
        <Card className="rounded-lg border-[var(--border)] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Field settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Label" value="Title" />
            <Field label="API name" value="title" />
            <Field label="Field type" value="Text" />
            <div className="space-y-2 text-sm">
              {["Required field", "Show in record preview", "Allow localized values"].map((label, index) => (
                <label className="flex items-center gap-2" key={label}>
                  <span className={index === 0 ? "h-3.5 w-3.5 rounded-sm bg-slate-950" : "h-3.5 w-3.5 rounded-sm border"} />
                  {label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ContentEditor() {
  return (
    <section>
      <PageHeader
        action={<Button>Publish changes</Button>}
        description="Focused editing with preview and metadata separated."
        eyebrow="Content"
        title="hey bitch this is the first record"
      />
      <div className="grid grid-cols-[1fr_158px] gap-4">
        <div className="space-y-3">
          <Field label="Title" value="hey bitch this is the first record" />
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea className="h-[150px] resize-none bg-white" defaultValue="still cool" />
          </div>
          <Field label="Publish Date" value="06/08/2026" />
          <div className="flex gap-2">
            <Button>Save record</Button>
            <Button variant="outline">Reset</Button>
          </div>
        </div>
        <aside className="space-y-3">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="pb-2">
              <p className="font-data text-[10px] font-bold uppercase text-slate-400">Live preview</p>
              <CardTitle className="text-base">hey bitch this is the first record</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">still cool</CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardContent className="grid grid-cols-2 gap-y-2 p-4 text-[11px]">
              <span className="font-bold text-slate-500">Status</span>
              <span>Draft</span>
              <span className="font-bold text-slate-500">Collection</span>
              <span>articles</span>
              <span className="font-bold text-slate-500">Updated</span>
              <span>Today, 10:19 PM</span>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function MediaLibrary() {
  return (
    <section>
      <PageHeader
        action={<Button>Upload asset</Button>}
        description="Upload, browse, and attach media assets."
        eyebrow="Media"
        title="Media library"
      />
      <Card className="rounded-lg border-dashed bg-white shadow-none">
        <CardContent className="flex h-36 items-center justify-center text-sm text-slate-500">
          Drop files here or choose files to upload.
        </CardContent>
      </Card>
    </section>
  );
}

function TeamRoles() {
  return (
    <section>
      <PageHeader
        action={<Button>Invite teammate</Button>}
        description="Manage users, roles, and access boundaries."
        eyebrow="Team"
        title="Team and roles"
      />
      <div className="space-y-3">
        {["Administrator", "Editor", "Contributor", "Viewer"].map((role) => (
          <Card className="rounded-lg bg-white shadow-none" key={role}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{role}</p>
                <p className="text-xs text-slate-500">Role permissions and collection access.</p>
              </div>
              <Badge variant="outline">Built in</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SettingsApiKeys() {
  return (
    <section>
      <PageHeader
        action={<Button>Create API key</Button>}
        description="Configure project access, public API keys, and OAuth."
        eyebrow="Settings"
        title="Settings"
      />
      <div className="grid gap-4">
        <Field label="Public website" value="Production website" />
        <Field label="Access level" value="Read only" />
        <Card className="rounded-lg bg-white shadow-none">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">No managed keys</span>
            <Button size="sm">Create API key</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function UserSettings() {
  return (
    <section>
      <PageHeader
        action={<Button>Save changes</Button>}
        description="Manage your profile details and account access."
        eyebrow="Account"
        title="User settings"
      />
      <div className="grid grid-cols-[1fr_158px] gap-4">
        <div className="space-y-3">
          <Field label="Name" value="Maya Chen" />
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Textarea className="h-[150px] resize-none bg-white" defaultValue="maya@datamix.io" />
          </div>
          <Field label="Avatar" value="Upload new avatar" />
          <div className="flex gap-2">
            <Button>Save changes</Button>
            <Button className="border-red-300 text-red-600 hover:text-red-700" variant="outline">
              Sign out
            </Button>
          </div>
        </div>
        <Card className="rounded-lg bg-white shadow-none">
          <CardHeader>
            <p className="font-data text-[10px] font-bold uppercase text-slate-400">Profile preview</p>
            <CardTitle>Maya Chen</CardTitle>
            <p className="text-xs text-slate-500">maya@datamix.io</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-2 text-[11px]">
            <span className="font-bold text-slate-500">Role</span>
            <span>Administrator</span>
            <span className="font-bold text-slate-500">Avatar</span>
            <span>MC</span>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-lg bg-white shadow-none">
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="bg-white" defaultValue={value} />
    </div>
  );
}
