import { useState, useRef, useCallback, useEffect } from "react";
import { Video, X, Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Clock, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface VideoUploaderProps {
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  listingTitle?: string;
  maxDurationSec?: number;
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

const ACCEPTED_FORMATS = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/avi"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function generateThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata. The file may be corrupted."));
    };
  });
}

const VideoUploader = ({ videoUrl, onVideoChange, listingTitle, maxDurationSec = 120 }: VideoUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "checking" | "uploading" | "verifying">("idle");
  const [report, setReport] = useState<VideoReport | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear thumbnail when video is removed
  useEffect(() => {
    if (!videoUrl) {
      setThumbnail(null);
      setDuration(null);
    }
  }, [videoUrl]);

  const handleFile = useCallback(async (file: File | null) => {
    if (!file || !user) return;
    setErrorMsg(null);
    setReport(null);
    setLastFile(file);

    // Format check
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setErrorMsg("Unsupported format. Please upload MP4, MOV, AVI, or WebM.");
      toast({ title: "Invalid format", description: "Supported: MP4, MOV, AVI, WebM.", variant: "destructive" });
      return;
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg("Video exceeds 50MB limit. Please compress and re-upload.");
      toast({ title: "Video too large", description: "Maximum video size is 50MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setStage("checking");
    setProgress(5);

    try {
      // Duration & corruption check
      let dur: number;
      try {
        dur = await getVideoDuration(file);
      } catch {
        setErrorMsg("Could not read video. The file may be corrupted.");
        toast({ title: "Corrupted video", description: "Unable to read the video file.", variant: "destructive" });
        setUploading(false);
        setStage("idle");
        return;
      }

      setDuration(dur);
      setProgress(15);

      if (dur > maxDurationSec) {
        setErrorMsg(`Video is ${formatDuration(dur)} long. Maximum allowed is ${formatDuration(maxDurationSec)}.`);
        toast({ title: "Video too long", description: `Max duration is ${formatDuration(maxDurationSec)}.`, variant: "destructive" });
        setUploading(false);
        setStage("idle");
        return;
      }

      // Thumbnail generation
      const thumb = await generateThumbnail(file);
      setThumbnail(thumb);
      setProgress(25);

      // Upload
      setStage("uploading");
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `${user.id}/${Date.now()}-video.${ext}`;

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 3, 75));
      }, 200);

      const { error } = await supabase.storage
        .from("listing-videos")
        .upload(fileName, file, { contentType: file.type, upsert: false });

      clearInterval(progressInterval);

      if (error) throw error;
      setProgress(80);

      const { data } = supabase.storage.from("listing-videos").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      // AI Validation
      setStage("verifying");
      setValidating(true);
      setProgress(85);

      const { data: validation, error: valError } = await supabase.functions.invoke("validate-video", {
        body: { video_url: publicUrl, listing_title: listingTitle },
      });

      setValidating(false);
      setProgress(95);

      if (valError) {
        console.error("Video validation error:", valError);
        onVideoChange(publicUrl);
        toast({ title: "Video uploaded ✓", description: "AI verification was skipped." });
        setProgress(100);
        setUploading(false);
        setStage("idle");
        return;
      }

      setReport(validation);

      if (!validation.approved) {
        await supabase.storage.from("listing-videos").remove([fileName]);
        setErrorMsg(validation.reason || "Video did not pass verification.");
        toast({ title: "❌ Video Rejected", description: validation.reason, variant: "destructive" });
        setProgress(0);
        setUploading(false);
        setStage("idle");
        return;
      }

      setProgress(100);
      onVideoChange(publicUrl);
      toast({ title: "Video verified & uploaded ✓" });
    } catch (err: any) {
      console.error("Video upload error:", err);
      setErrorMsg(err.message || "Upload failed. Please try again.");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }

    setUploading(false);
    setStage("idle");
  }, [user, listingTitle, maxDurationSec, onVideoChange, toast]);

  const handleRetry = () => {
    if (lastFile) {
      handleFile(lastFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const stageLabel = stage === "checking" ? "Validating file…" : stage === "uploading" ? "Uploading video…" : stage === "verifying" ? "AI verifying…" : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-foreground">Product Video</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional · Max 50MB · {formatDuration(maxDurationSec)} max · AI verified
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <ShieldCheck className="h-3 w-3" /> AI Verified
        </span>
      </div>

      {!videoUrl ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-primary transition-all hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50"
          >
            {uploading ? (
              <div className="flex w-full flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs font-medium">{stageLabel}</span>
                <div className="w-full max-w-xs">
                  <Progress value={progress} className="h-2" />
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">{progress}%</p>
                </div>
              </div>
            ) : (
              <>
                <Video className="h-6 w-6" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Add Product Video</p>
                  <p className="text-[11px] text-muted-foreground">MP4, MOV, AVI, WebM · Show your product in action</p>
                </div>
              </>
            )}
          </button>

          {/* Thumbnail preview during upload */}
          {uploading && thumbnail && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
              <img src={thumbnail} alt="Video preview" className="h-12 w-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{lastFile?.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {duration && (
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {formatDuration(duration)}</span>
                  )}
                  <span className="flex items-center gap-0.5"><Film className="h-3 w-3" /> {(lastFile!.size / (1024 * 1024)).toFixed(1)}MB</span>
                </div>
              </div>
            </div>
          )}

          {/* Error & Retry */}
          {errorMsg && !uploading && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-destructive">{errorMsg}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={handleRetry}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Retry Upload
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl border border-border overflow-hidden">
          {thumbnail && (
            <div className="absolute left-2 top-2 z-10">
              <img src={thumbnail} alt="Thumbnail" className="h-10 w-14 rounded-lg border border-background/50 object-cover shadow-md" />
            </div>
          )}
          <video
            src={videoUrl}
            controls
            preload="metadata"
            playsInline
            className="w-full max-h-48 rounded-2xl bg-black"
          />
          <button
            type="button"
            onClick={() => { onVideoChange(null); setReport(null); setErrorMsg(null); }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background transition hover:bg-foreground/90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {duration && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
              <Clock className="h-3 w-3" /> {formatDuration(duration)}
            </div>
          )}
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
        accept="video/mp4,video/mov,video/webm,video/quicktime,video/x-msvideo,video/avi"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
    </div>
  );
};

export default VideoUploader;
