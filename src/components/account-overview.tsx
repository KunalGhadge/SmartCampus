import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, UserCheck, ShieldCheck, BookOpen, GraduationCap, Building2 } from "lucide-react";
import { EditProfileModal } from "@/components/edit-profile-modal";

export function formatProfileDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Unknown";

  const numeric = typeof value === "number" ? value : Number(value);
  const parsed =
    Number.isFinite(numeric) && numeric > 1e12 ? new Date(numeric) : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function AccountOverview({ profile }: { profile: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const email = profile?.email ?? "No email on file";
  const department = profile?.department || "Computer Engineering (CSE)";
  const college = profile?.college || "MGM CET (Engineering)";
  const graduationYear = profile?.graduationYear ? `Class of ${profile.graduationYear}` : "Class of 2026";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Account & Campus Profile</h3>
          <p className="text-xs text-muted-foreground">Your verified identity across MGM CampusKart</p>
        </div>
        <Button
          onClick={() => setEditOpen(true)}
          variant="outline"
          size="sm"
          className="rounded-full flex items-center gap-1.5 shadow-sm hover:border-primary/50"
        >
          <Edit3 className="h-3.5 w-3.5 text-primary" />
          <span>Edit Profile</span>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Email", value: email, icon: UserCheck },
          { label: "Department", value: department, icon: BookOpen },
          { label: "College", value: college, icon: Building2 },
          { label: "Graduation", value: graduationYear, icon: GraduationCap },
          { label: "Member since", value: formatProfileDate(profile?.createdAt), icon: ShieldCheck },
          {
            label: "Verification",
            value: profile?.emailVerified ? "Email verified" : "Verification pending",
            icon: ShieldCheck,
          },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </span>
              <item.icon className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <div
              className="mt-2 text-sm font-semibold text-foreground break-words"
              data-testid={`account-${item.label.replace(/\s+/g, "-")}`}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

export default AccountOverview;
