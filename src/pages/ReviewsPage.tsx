import { useState, useEffect } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_profile?: { full_name: string; avatar_url: string | null } | null;
}

const ReviewsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchReviews = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewed_user_id", user.id)
        .order("created_at", { ascending: false });

      const reviewsList = (data || []) as Review[];

      // Fetch reviewer profiles
      const reviewerIds = [...new Set(reviewsList.map((r) => r.reviewer_profile ? null : (r as any).reviewer_id).filter(Boolean))];
      if (reviewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", reviewerIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        reviewsList.forEach((r: any) => {
          r.reviewer_profile = profileMap.get(r.reviewer_id) || null;
        });
      }

      setReviews(reviewsList);
      if (reviewsList.length > 0) {
        setAvgRating(reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length);
      }
      setLoading(false);
    };
    fetchReviews();
  }, [user]);

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Reviews & Ratings</h1>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-6">
        {/* Rating Summary */}
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 dentzap-card-shadow">
          <p className="text-4xl font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
          <div className="mt-2 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-5 w-5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 skeleton rounded-2xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Star className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-base font-semibold text-foreground">No reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Reviews from buyers and sellers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
                <div className="flex items-center gap-3">
                  {(review.reviewer_profile as any)?.avatar_url ? (
                    <img src={(review.reviewer_profile as any).avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                      {((review.reviewer_profile as any)?.full_name || "?")[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{(review.reviewer_profile as any)?.full_name || "User"}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReviewsPage;
