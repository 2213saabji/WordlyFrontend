"use client";

import { useState, type FormEvent } from "react";
import { submitContactMessage, ApiRequestError, type ContactCategory } from "@/lib/api";

const CATEGORIES: { value: ContactCategory; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "word-suggestion", label: "Word suggestion" },
  { value: "account", label: "Account" },
  { value: "groups", label: "Groups" },
  { value: "other", label: "Something else" },
];

const MESSAGE_MAX = 4000;

/** Maps the backend's one-error-at-a-time message text to the field it
 * actually describes, so it renders inline next to that field rather than
 * as a generic toast — the message text itself is the whole point. */
function fieldFor(message: string): "category" | "name" | "email" | "message" | null {
  if (message.includes("category")) return "category";
  if (message.includes("email")) return "email";
  if (message.includes("name")) return "name";
  if (message.includes("message")) return "message";
  return null;
}

export default function ContactForm() {
  const [category, setCategory] = useState<ContactCategory>("bug");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldError(null);
    try {
      await submitContactMessage({ category, name, email, message });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
      setCategory("bug");
    } catch (err) {
      const text = err instanceof ApiRequestError ? err.message : "Something went wrong — please try again.";
      setFieldError({ field: fieldFor(text) ?? "form", text });
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-accent/28 bg-accent/8 p-10 text-center">
        <span className="text-lg font-semibold">Thanks — we got your message.</span>
        <span className="text-[14.5px] text-[#c9bfcc]">We usually reply within two working days.</span>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-2 text-sm font-semibold text-accent underline hover:no-underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5.5">
      <div className="flex flex-col gap-2.5">
        <span className="text-[13.5px] font-semibold">What&apos;s it about?</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const selected = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`rounded-xl border px-3.75 py-2.5 text-[13.5px] font-semibold ${
                  selected
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-white/10 bg-white/5 text-[#c9bfcc] hover:bg-white/8"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        {fieldError?.field === "category" && <p className="text-[13px] text-danger">{fieldError.text}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[13.5px] font-semibold">Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.75 text-[15px] outline-none transition-colors focus:border-accent/50"
          />
          {fieldError?.field === "name" && <p className="text-[13px] text-danger">{fieldError.text}</p>}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13.5px] font-semibold">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.75 text-[15px] outline-none transition-colors focus:border-accent/50"
          />
          {fieldError?.field === "email" && <p className="text-[13px] text-danger">{fieldError.text}</p>}
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between text-[13.5px] font-semibold">
          Message
          <span className="text-xs font-normal text-[#9a8aa2]">
            {message.length}/{MESSAGE_MAX}
          </span>
        </span>
        <textarea
          required
          rows={5}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-[15px] outline-none transition-colors focus:border-accent/50"
        />
        {fieldError?.field === "message" && <p className="text-[13px] text-danger">{fieldError.text}</p>}
      </label>

      {fieldError?.field === "form" && <p className="text-[13.5px] text-danger">{fieldError.text}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-2xl bg-accent px-6.5 py-3.75 text-[15px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
