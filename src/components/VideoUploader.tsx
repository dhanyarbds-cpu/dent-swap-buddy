import { useState, useRef, useCallback } from "react";
import { Video, X, Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface VideoUploaderProps {
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  listingTitle?: string;
}

interface VideoReport {
  approved: boolean;
  validity_score: number;
  reason: string;
  category: string;
  issues_detected: string[];
  suggestions: string[];
  shows_product: boolean;
  estimated_condition: string;
}

const VideoUploader = ({ videoUrl, onVideoChange, listingTitle }: VideoUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<VideoReport | null>(null);

  const handleFile = useCallback(async (file: File | null) => {
    if (!file || !user) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid format", description: "Please upload a video file (MP4, MOV, WebM).", variant: "destructive" });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Video too large", description: "Maximum video size is 50MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setReport(null);

    try {
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `${user.id}/${Date.now()}-video.${ext}`;

      const { error } = await supabase.storage
        .from("listing-images")
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (error) throw error;

      const { data } = supabase.storage.from("listing-images").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      // AI Video Validation
      setValidating(true);
      const { data: validation, error: valError } = await supabase.functions.invoke("validate-video", {
        body: { video_url: publicUrl, listing_title: listingTitle },
      });
      setValidating(false);

      if (valError) {
        console.error("Video validation error:", valError);
        onVideoChange(publicUrl);
        toast({ title: "Video uploaded ✓", description: "Verification was skipped." });
        setUploading(false);
        return;
      }

      setReport(validation);

      if (!validation.approved) {
        await supabase.storage.from("listing-images").remove([fileName]);
        toast({
          title: "❌ Video Rejected",
          description: validation.reason,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      onVideoChange(publicUrl);
      toast({ title: "Video verified & uploaded ✓" });
    } catch (err: any) {
      console.error("Video upload error:", err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }

    setUploading(false);
  }, [user, listingTitle, onVideoChange, toast]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-foreground">Product Video</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional · Max 50MB · AI verified
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <ShieldCheck className="h-3 w-3" /> AI Verified
        </span>
      </div>

      {!videoUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-primary transition-all hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-medium">
                {validating ? "AI verifying video…" : "Uploading…"}
              </span>
            </div>
          ) : (
            <>
              <Video className="h-6 w-6" />
              <div className="text-left">
                <p className="text-sm font-semibold">Add Product Video</p>
                <p className="text-[11px] text-muted-foreground">Show your product in action</p>
              </div>
            </>
          )}
        </button>
      ) : (
        <div className="relative rounded-2xl border border-border overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-48 rounded-2xl bg-black"
          />
          <button
            onClick={() => { onVideoChange(null); setReport(null); }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background transition hover:bg-foreground/90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Verification Report */}
      {report && (
        <div className={`rounded-xl border p-3 animate-fade-in ${
          report.approved
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {report.approved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <p className={`text-xs font-bold ${report.approved ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
              Verification Report — Score: {report.validity_score}/100
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground mb-2">{report.reason}</p>

          {report.issues_detected.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Issues</p>
              {report.issues_detected.map((issue, i) => (
                <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {issue}
                </p>
              ))}
            </div>
          )}

          {report.suggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Suggestions</p>
              {report.suggestions.map((s, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">• {s}</p>
              ))}
            </div>
          )}

          {report.estimated_condition !== "Unknown" && (
            <p className="mt-2 text-[11px] font-semibold text-foreground">
              Estimated Condition: {report.estimated_condition}
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/mov,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
};

export default VideoUploader;
