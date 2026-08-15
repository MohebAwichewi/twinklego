"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LockKeyhole, MessageCircle, Send } from "lucide-react";
import type { ErrandStatus, TaskMessage } from "@/lib/types";

const visibleStatuses: ErrandStatus[] = ["accepted", "in_progress", "awaiting_confirmation", "payout_pending", "completed", "disputed"];
const writableStatuses: ErrandStatus[] = ["accepted", "in_progress", "awaiting_confirmation", "payout_pending", "disputed"];

export default function TaskChat({ errandId, userId, status }: { errandId: number; userId: string | null; status: ErrandStatus }) {
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/errands/${errandId}/messages`);
    if (!response.ok) return setLoading(false);
    const data = await response.json();
    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [errandId]);

  useEffect(() => {
    if (!visibleStatuses.includes(status)) return;
    loadMessages();
    const interval = window.setInterval(loadMessages, 15_000);
    return () => window.clearInterval(interval);
  }, [loadMessages, status]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const response = await fetch(`/api/errands/${errandId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await response.json();
    setSending(false);
    if (!response.ok) return setError(data.error || "Message could not be sent.");
    setMessages(current => [...current, data]);
    setDraft("");
  }

  if (!visibleStatuses.includes(status)) return null;

  return (
    <section className="detail-card task-chat-card">
      <div className="task-chat-head">
        <div><h3><MessageCircle size={18} /> Task conversation</h3><p>Keep updates, instructions, and proof inside TwinkleGo.</p></div>
        <span><LockKeyhole size={12} /> Task parties only</span>
      </div>

      <div className="task-chat-list" aria-live="polite">
        {loading ? <div className="task-chat-empty"><Loader2 size={18} className="spin" /> Loading conversation...</div> : null}
        {!loading && messages.length === 0 ? <div className="task-chat-empty"><MessageCircle size={20} /> No messages yet. Keep task communication here.</div> : null}
        {messages.map(message => {
          const mine = message.sender_id === userId;
          return (
            <div key={message.id} className={`task-message ${mine ? "mine" : ""}`}>
              <span>{mine ? "You" : message.sender?.full_name || "Task participant"}</span>
              <p>{message.body}</p>
              <time>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          );
        })}
      </div>

      {writableStatuses.includes(status) ? (
        <form className="task-chat-form" onSubmit={sendMessage}>
          <input aria-label="Message" maxLength={1000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Share an update without leaving TwinkleGo" />
          <button className="button button-small" disabled={sending || !draft.trim()} aria-label="Send message">
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </form>
      ) : <small className="task-chat-closed">This conversation is read-only because the task is complete.</small>}
      {error ? <div className="auth-error">{error}</div> : null}
    </section>
  );
}
