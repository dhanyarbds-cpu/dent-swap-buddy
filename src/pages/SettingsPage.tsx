import { useState } from "react";
import { ArrowLeft, Moon, Bell, Lock, KeyRound, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated ✓" });
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    }
    setChangingPw(false);
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Settings</h1>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-5">
        {/* Appearance */}
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Appearance</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <Moon className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notifications</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
            <button
              onClick={() => navigate("/notification-settings")}
              className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-secondary/50 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <Bell className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Notification Preferences</p>
                <p className="text-xs text-muted-foreground">Manage which notifications you receive</p>
              </div>
            </button>
          </div>
        </div>

        {/* Security */}
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Security</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-secondary/50 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <KeyRound className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
            </button>

            {showPassword && (
              <div className="border-t border-border px-4 py-4 space-y-3 animate-fade-in">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="rounded-xl"
                  maxLength={64}
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rounded-xl"
                  maxLength={64}
                />
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPw}
                  className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-primary-foreground"
                >
                  {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {changingPw ? "Updating..." : "Update Password"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Account</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow px-4 py-4">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="text-sm font-semibold text-foreground">{user?.email}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
