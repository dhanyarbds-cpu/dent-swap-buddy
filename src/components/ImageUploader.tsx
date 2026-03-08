import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, GripVertical, ShieldCheck, ShieldAlert, AlertTriangle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  onConditionDetected?: (rating: string, details: string) => void;
}

interface ValidationResult {
  approved: boolean;
  reason: string;
  confidence: number;
  category: string;
  condition_rating?: string;
  condition_details?: string;
  counterfeit_flag?: boolean;
  counterfeit_reason?: string;
  improvement_suggestions?: string[];
  needs_admin_review?: boolean;
}

const MAX_SIZE = 1920;
const QUALITY = 0.82;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/webp",
        QUALITY
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

async function validateImage(imageUrl: string): Promise<ValidationResult> {
  const { data, error } = await supabase.functions.invoke("validate-image", {
    body: { image_url: imageUrl },
  });
  if (error) {
    console.error("Validation error:", error);
    return { approved: true, reason: "Validation skipped", confidence: 100, category: "product" };
  }
  return data;
}

const rejectionMessages: Record<string, string> = {
  human: "Human photos are not allowed. Please upload product images only.",
  inappropriate: "This image contains inappropriate content and cannot be used.",
  irrelevant: "This image does not appear to be a relevant product listing.",
  low_quality: "This image is too blurry or low quality. Please upload a clearer photo.",
  stock_image: "Stock images are not allowed. Please upload original photos of your actual product.",
  consumable: "This image has been classified as a consumable product.",
};

const conditionColors: Record<string, string> = {
  Excellent: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
  Good: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
  Fair: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
  Poor: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30",
};

const ImageUploader = ({ images, onImagesChange, maxImages = 8, onConditionDetected }: ImageUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [validatingIndex, setValidatingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [conditionRatings, setConditionRatings] = useState<Record<string, { rating: string; details: string }>>({});
  const [showSuggestions, setShowSuggestions] = useState<string[] | null>(null);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;

    const validFiles = Array.from(files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );

    if (validFiles.length === 0) {
      toast({ title: "Invalid format", description: "Please use JPG, PNG, or WebP images.", variant: "destructive" });
      return;
    }

    const remaining = maxImages - images.length;
    const toUpload = validFiles.slice(0, remaining);

    if (validFiles.length > remaining) {
      toast({ title: "Limit reached", description: `Only ${remaining} more image(s) can be added.` });
    }

    setUploading(true);
    setUploadProgress(new Array(toUpload.length).fill(0));

    const newUrls: string[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      try {
        setUploadProgress((prev) => { const n = [...prev]; n[i] = 20; return n; });

        const compressed = await compressImage(toUpload[i]);
        setUploadProgress((prev) => { const n = [...prev]; n[i] = 40; return n; });

        const ext = "webp";
        const fileName = `${user.id}/${Date.now()}-${i}.${ext}`;

        const { error } = await supabase.storage
          .from("listing-images")
          .upload(fileName, compressed, { contentType: "image/webp", upsert: false });

        if (error) throw error;

        setUploadProgress((prev) => { const n = [...prev]; n[i] = 70; return n; });

        const publicUrl = getPublicUrl(fileName);

        // AI Validation with condition assessment
        setValidatingIndex(i);
        const validation = await validateImage(publicUrl);
        setValidatingIndex(null);

        if (!validation.approved) {
          await supabase.storage.from("listing-images").remove([fileName]);
          const msg = rejectionMessages[validation.category] || validation.reason;
          toast({
            title: "❌ Image Rejected",
            description: msg,
            variant: "destructive",
          });

          // Show improvement suggestions if available
          if (validation.improvement_suggestions && validation.improvement_suggestions.length > 0) {
            setShowSuggestions(validation.improvement_suggestions);
            setTimeout(() => setShowSuggestions(null), 8000);
          }

          setUploadProgress((prev) => { const n = [...prev]; n[i] = 0; return n; });
          continue;
        }

        // Store condition rating
        if (validation.condition_rating && validation.condition_rating !== "Unknown") {
          setConditionRatings((prev) => ({
            ...prev,
            [publicUrl]: { rating: validation.condition_rating!, details: validation.condition_details || "" },
          }));
          onConditionDetected?.(validation.condition_rating, validation.condition_details || "");
        }

        // Handle counterfeit flag
        if (validation.counterfeit_flag) {
          toast({
            title: "⚠️ Authenticity Warning",
            description: validation.counterfeit_reason || "This product has been flagged for admin review.",
          });
        }

        // Handle admin review needed
        if (validation.needs_admin_review) {
          toast({
            title: "Under Review",
            description: "This image has been flagged for additional review. Your listing may take longer to go live.",
          });
        }

        setUploadProgress((prev) => { const n = [...prev]; n[i] = 100; return n; });
        newUrls.push(publicUrl);
      } catch (err: any) {
        console.error("Upload error:", err);
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }

    if (newUrls.length > 0) {
      onImagesChange([...images, ...newUrls]);
      toast({ title: `${newUrls.length} image(s) verified & uploaded ✓` });
    }

    setUploading(false);
    setUploadProgress([]);
  }, [images, maxImages, user, onImagesChange, toast, onConditionDetected]);

  const removeImage = (index: number) => {
    const url = images[index];
    setConditionRatings((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    onImagesChange(reordered);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-foreground">Product Photos</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {images.length}/{maxImages} photos · AI verified · Drag to reorder
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <ShieldCheck className="h-3 w-3" /> AI Verified
          </span>
          {images.length > 0 && (
            <span className="rounded-full bg-verified/10 px-2.5 py-0.5 text-[10px] font-semibold text-verified">
              {images.length} uploaded
            </span>
          )}
        </div>
      </div>

      {/* Improvement suggestions banner */}
      {showSuggestions && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 animate-fade-in">
          <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-primary" /> Tips for better photos
          </p>
          <ul className="space-y-0.5">
            {showSuggestions.map((s, i) => (
              <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {/* Upload Button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary transition-all hover:border-primary/50 hover:bg-primary/10 press-scale disabled:opacity-50"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="h-5 w-5 animate-spin" />
                {validatingIndex !== null && (
                  <span className="text-[8px] font-medium">Scanning…</span>
                )}
              </div>
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-[9px] font-semibold">Add Photo</span>
              </>
            )}
          </button>
        )}

        {/* Image Previews */}
        {images.map((url, i) => {
          const condition = conditionRatings[url];
          return (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`group relative aspect-square overflow-hidden rounded-2xl border transition-all duration-200 ${
                dragIndex === i ? "border-primary ring-2 ring-primary/20 scale-95" : "border-border"
              }`}
            >
              <img src={url} alt={`Product ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              {i === 0 && (
                <div className="absolute bottom-1 left-1 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                  Cover
                </div>
              )}
              {/* Condition badge */}
              {condition && (
                <div className={`absolute top-1 left-1 rounded-md px-1.5 py-0.5 text-[7px] font-bold ${conditionColors[condition.rating] || "text-muted-foreground bg-secondary"}`}>
                  {condition.rating}
                </div>
              )}
              <button
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-1 right-1 rounded-md bg-foreground/40 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="h-3 w-3 text-background" />
              </div>
            </div>
          );
        })}

        {/* Empty Slots */}
        {Array.from({ length: Math.max(0, Math.min(maxImages, 4) - images.length - 1) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-2xl border border-dashed border-border bg-secondary/30" />
        ))}
      </div>

      {/* Upload progress */}
      {uploading && uploadProgress.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {uploadProgress.map((p, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${p}%` }} />
              </div>
            ))}
          </div>
          {validatingIndex !== null && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary animate-pulse" />
              AI verifying image quality, content & condition…
            </p>
          )}
        </div>
      )}

      {/* Condition summary */}
      {Object.keys(conditionRatings).length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">AI Condition Assessment</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(conditionRatings).map((cr, i) => (
              <span key={i} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${conditionColors[cr.rating] || "text-muted-foreground bg-secondary"}`}>
                {cr.rating}
              </span>
            ))}
          </div>
          {Object.values(conditionRatings)[0]?.details && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {Object.values(conditionRatings)[0].details}
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

export default ImageUploader;
