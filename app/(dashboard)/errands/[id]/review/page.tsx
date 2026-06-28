"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Star, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [errandTitle, setErrandTitle] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`/api/errands/${id}`).then(r => r.json()).then(async (errand) => {
      setErrandTitle(errand.title || "");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Review the other party
      const other = user.id === errand.customer_id ? errand.assigned_runner_id : errand.customer_id;
      setRevieweeId(other);
    });
  }, [id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revieweeId) return;
    setLoading(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errand_id: Number(id), reviewee_id: revieweeId, rating, comment }),
    });
    setLoading(false);
    if (res.ok) router.push(`/errands/${id}`);
  }

  if (!mounted) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <Link href={`/errands/${id}`} className="back-link"><ArrowLeft size={15} /> Back to errand</Link>
          <h1>Leave a Review</h1>
          <p>Rate your experience with &quot;{errandTitle}&quot;</p>
        </div>
      </div>

      <div className="form-card review-form-card">
        <form onSubmit={handleSubmit} className="review-form">
          <div className="star-picker">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                className={`star-btn ${s <= rating ? "active" : ""}`}
                onClick={() => setRating(s)}
              >
                <Star size={32} fill={s <= rating ? "currentColor" : "none"} />
              </button>
            ))}
            <span className="star-label">{rating === 5 ? "Excellent" : rating === 4 ? "Good" : rating === 3 ? "Okay" : rating === 2 ? "Poor" : "Terrible"}</span>
          </div>

          <label>Comment (optional)
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." rows={4} />
          </label>

          <button type="submit" className="button" disabled={loading}>
            {loading ? <><Loader2 size={15} className="spin" /> Submitting...</> : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
}
