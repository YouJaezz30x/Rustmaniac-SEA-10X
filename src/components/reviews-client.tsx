"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { csrfFetch } from "@/lib/csrf-client";

type Review = {
  id: string;
  author: string;
  rating: number;
  body: string;
};

export function ReviewsClient({ initial }: { initial: Review[] }) {
  const { data: session } = useSession();
  const [author, setAuthor] = useState(session?.user?.name ?? "");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await csrfFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ author, rating, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage("Thanks — your review is pending admin approval.");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="review-grid">
        {initial.map((review) => (
          <article key={review.id} className="review">
            <p className="package__tier">{"★".repeat(review.rating)}</p>
            <h3>{review.author}</h3>
            <p className="muted">{review.body}</p>
          </article>
        ))}
      </div>

      <div className="cart-panel">
        <div className="section-head">
          <h2>Leave a review</h2>
          <p className="muted">Signed-in players can submit; admins approve before publish.</p>
        </div>
        {!session ? (
          <p className="alert">
            <a href="/login">Sign in</a> to leave a review.
          </p>
        ) : (
          <form className="form" onSubmit={submit}>
            {message && <p className="alert alert--ok">{message}</p>}
            {error && <p className="alert alert--error">{error}</p>}
            <label>
              Display name
              <input value={author} onChange={(e) => setAuthor(e.target.value)} required />
            </label>
            <label>
              Rating
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Review
              <textarea value={body} onChange={(e) => setBody(e.target.value)} required />
            </label>
            <button className="btn btn--solid" type="submit">
              Submit
            </button>
          </form>
        )}
      </div>
    </>
  );
}
