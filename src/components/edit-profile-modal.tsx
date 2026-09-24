import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUserProfile, useUpdateProfileMutation, type UserProfile } from "@/lib/user-profile";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { awardProfileCompletionBonus, isProfileBonusClaimed } from "@/lib/economy";
import { toast } from "sonner";
import { Sparkles, Dices, Upload, Check, User, GraduationCap, Building2, BookOpen, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Rhea",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Yash",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Tanvi",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Kabir",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mihir",
  "https://api.dicebear.com/7.x/bottts/svg?seed=SmartBot",
  "https://api.dicebear.com/7.x/notionists/svg?seed=CampusStudent",
];

const DEPARTMENTS = [
  "Computer Engineering (CSE)",
  "Information Technology (IT)",
  "Artificial Intelligence & Data Science",
  "Electronics & Telecom (EXTC)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Architecture",
  "MBA / Management Studies",
  "Biotechnology",
  "General / Other",
];

const GRADUATION_YEARS = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const COLLEGES = [
  "MGM CET (Engineering)",
  "MGM University",
  "MGM College of CS & IT",
  "MGM Institute of Management",
  "MGM College (Main Campus)",
];

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useCurrentUserProfile();
  const updateMutation = useUpdateProfileMutation();
  const profile = profileQuery.data;

  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [department, setDepartment] = useState("Computer Engineering (CSE)");
  const [college, setCollege] = useState("MGM CET (Engineering)");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [isCustomUrlOpen, setIsCustomUrlOpen] = useState(false);
  const alreadyClaimed = user?.uid ? isProfileBonusClaimed(user.uid) : false;

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || profile.fullName || "");
      setPhotoUrl(profile.photoUrl || PRESET_AVATARS[0]);
      setDepartment(
        profile.department && profile.department !== "General"
          ? profile.department
          : "Computer Engineering (CSE)"
      );
      setCollege(
        profile.college && profile.college !== "SmartCampus University"
          ? profile.college
          : "MGM CET (Engineering)"
      );
      setGraduationYear(profile.graduationYear || "2026");
    }
  }, [profile, open]);

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    setPhotoUrl(newAvatar);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large", {
        description: "Please select an image under 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
        toast.success("Profile photo uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Name is required", {
        description: "Please enter your full or display name.",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        displayName: displayName.trim(),
        photoUrl: photoUrl.trim(),
        department,
        college,
        campus: college,
        graduationYear,
      });

      // Award profile completion bonus points (+100 Campus Points)
      if (user?.uid) {
        const bonusResult = await awardProfileCompletionBonus(user.uid, 100);
        if (bonusResult.awarded) {
          queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
          toast.success("🎉 +100 Campus Points Earned!", {
            description: "You received 100 points for completing your campus profile!",
          });
        } else {
          toast.success("Profile updated successfully", {
            description: "Your name, avatar, and campus details are now synced.",
          });
        }
      } else {
        toast.success("Profile updated successfully");
      }

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Edit Student Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update your avatar, full name, branch, and graduation year
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!alreadyClaimed && (
          <div className="mt-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Gift className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-foreground">Earn +100 Campus Points</p>
                <p className="text-[11px] text-muted-foreground">Save your verified branch & college details.</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
              +100 pts
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Avatar Section */}
          <div>
            <label className="text-xs font-semibold text-foreground">Profile Picture / Avatar</label>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/30 bg-secondary shadow-md">
                <img
                  src={photoUrl || PRESET_AVATARS[0]}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRandomizeAvatar}
                    className="rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Dices className="h-3.5 w-3.5" /> Randomize
                  </Button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition">
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomUrlOpen(!isCustomUrlOpen)}
                  className="text-left text-[11px] text-primary hover:underline"
                >
                  {isCustomUrlOpen ? "Hide custom URL input" : "Or enter custom image URL"}
                </button>
              </div>
            </div>

            {isCustomUrlOpen && (
              <div className="mt-3">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Quick Avatar Presets */}
            <div className="mt-3">
              <span className="text-[11px] font-medium text-muted-foreground">Quick pick presets:</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = photoUrl === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(url)}
                      className={cn(
                        "relative h-10 w-10 overflow-hidden rounded-xl border-2 transition-all hover:scale-105",
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 shadow-sm"
                          : "border-border/60 opacity-80 hover:opacity-100",
                      )}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover bg-secondary" />
                      {isSelected && (
                        <div className="absolute inset-0 grid place-items-center bg-primary/20 backdrop-blur-[1px]">
                          <Check className="h-4 w-4 text-primary font-bold" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <User className="h-3.5 w-3.5 text-primary" /> Full Name / Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kunal Ghadge"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Department / Branch */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Department / Branch
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* College & Graduation Year Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" /> College / Institute
              </label>
              <select
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {COLLEGES.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> Graduation Year
              </label>
              <select
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {GRADUATION_YEARS.map((year) => (
                  <option key={year} value={year}>
                    Class of {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2 flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-xl bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
            >
              {updateMutation.isPending ? "Saving changes..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
