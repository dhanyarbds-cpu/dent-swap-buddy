import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, GripVertical, Camera, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
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

const ImageUploader = ({ images, onImagesChange, maxImages = 8 }: ImageUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
        setUploadProgress((prev) => { const n = [...prev]; n[i] = 30; return n; });

        const compressed = await compressImage(toUpload[i]);
        setUploadProgress((prev) => { const n = [...prev]; n[i] = 60; return n; });

        const ext = "webp";
        const fileName = `${user.id}/${Date.now()}-${i}.${ext}`;

        const { error } = await supabase.storage
          .from("listing-images")
          .upload(fileName, compressed, { contentType: "image/webp", upsert: false });

        if (error) throw error;

        setUploadProgress((prev) => { const n = [...prev]; n[i] = 100; return n; });
        newUrls.push(getPublicUrl(fileName));
      } catch (err: any) {
        console.error("Upload error:", err);
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }

    if (newUrls.length > 0) {
      onImagesChange([...images, ...newUrls]);
      toast({ title: `${newUrls.length} image(s) uploaded ✓` });
    }

    setUploading(false);
    setUploadProgress([]);
  }, [images, maxImages, user, onImagesChange, toast]);

  const removeImage = (index: number) => {
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
            {images.length}/{maxImages} photos · Drag to reorder
          </p>
        </div>
        {images.length > 0 && (
          <span className="rounded-full bg-verified/10 px-2.5 py-0.5 text-[10px] font-semibold text-verified">
            {images.length} uploaded
          </span>
        )}
      </div>

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
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-[9px] font-semibold">Add Photo</span>
              </>
            )}
          </button>
        )}

        {/* Image Previews */}
        {images.map((url, i) => (
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
            <img
              src={url}
              alt={`Product ${i + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* First image badge */}
            {i === 0 && (
              <div className="absolute bottom-1 left-1 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                Cover
              </div>
            )}
            {/* Remove button */}
            <button
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
            {/* Drag handle */}
            <div className="absolute bottom-1 right-1 rounded-md bg-foreground/40 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <GripVertical className="h-3 w-3 text-background" />
            </div>
          </div>
        ))}

        {/* Empty Slots */}
        {Array.from({ length: Math.max(0, Math.min(maxImages, 4) - images.length - 1) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-2xl border border-dashed border-border bg-secondary/30" />
        ))}
      </div>

      {/* Upload progress */}
      {uploading && uploadProgress.length > 0 && (
        <div className="flex gap-1">
          {uploadProgress.map((p, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${p}%` }}
              />
            </div>
          ))}
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
