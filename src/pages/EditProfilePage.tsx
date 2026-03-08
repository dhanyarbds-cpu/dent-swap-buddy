import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Camera, Loader2, User, Phone, MapPin, Mail, FileText, AtSign, GraduationCap, Calendar, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const EditProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    college: profile?.college || "",
    year_of_study: profile?.year_of_study || "",
    location: profile?.location || "",
    avatar_url: profile?.avatar_url || "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !user) return;

    const file = files[0];
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Invalid format", description: "Use JPG, PNG, or WebP.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);

    try {
      // Compress
      const compressed = await compressAvatar(file);
      const fileName = `${user.id}/avatar-${Date.now()}.webp`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressed, { contentType: "image/webp", upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const url = data.publicUrl;

      setAvatarPreview(url);
      update("avatar_url", url);
      toast({ title: "Photo uploaded ✓" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!form.full_name.trim()) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          phone: form.phone.trim(),
          bio: form.bio.trim(),
          college: form.college.trim(),
          year_of_study: form.year_of_study.trim(),
          location: form.location.trim(),
          avatar_url: form.avatar_url || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "Profile updated successfully ✓" });
      navigate("/profile");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview || form.avatar_url;
  const initials = form.full_name
    ? form.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Edit Profile</h1>
      </header>

      <div className="mx-auto max-w-lg p-4 space-y-6 animate-fade-in">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-secondary"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-4 ring-secondary">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full dentzap-gradient text-primary-foreground shadow-lg transition hover:scale-105 disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-primary"
          >
            Change Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleAvatarUpload(e.target.files)}
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <FieldRow icon={User} label="Full Name" required>
            <Input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="Your full name"
              className="rounded-xl py-5"
              maxLength={100}
            />
          </FieldRow>

          <FieldRow icon={AtSign} label="Username">
            <Input
              value={form.username}
              onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="e.g. priya_dental"
              className="rounded-xl py-5"
              maxLength={30}
            />
          </FieldRow>

          <FieldRow icon={Mail} label="Email">
            <Input
              value={user?.email || ""}
              disabled
              className="rounded-xl py-5 opacity-60"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Email cannot be changed here</p>
          </FieldRow>

          <FieldRow icon={Phone} label="Phone Number">
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/[^\d+\s-]/g, ""))}
              placeholder="+91 98765 43210"
              className="rounded-xl py-5"
              maxLength={15}
            />
          </FieldRow>

          <FieldRow icon={GraduationCap} label="College / Institution">
            <Input
              value={form.college}
              onChange={(e) => update("college", e.target.value)}
              placeholder="e.g. GDC Mumbai"
              className="rounded-xl py-5"
              maxLength={100}
            />
          </FieldRow>

          <FieldRow icon={Calendar} label="Year of Study">
            <Input
              value={form.year_of_study}
              onChange={(e) => update("year_of_study", e.target.value)}
              placeholder="e.g. Final Year, Intern, MDS"
              className="rounded-xl py-5"
              maxLength={30}
            />
          </FieldRow>

          <FieldRow icon={MapPin} label="Location / City">
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Mumbai, Maharashtra"
              className="rounded-xl py-5"
              maxLength={100}
            />
          </FieldRow>

          <FieldRow icon={FileText} label="Short Bio">
            <Textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              className="rounded-xl"
              maxLength={200}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{form.bio.length}/200</p>
          </FieldRow>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

function FieldRow({ icon: Icon, label, required, children }: {
  icon: typeof User;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

async function compressAvatar(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const size = 400;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/webp",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default EditProfilePage;
