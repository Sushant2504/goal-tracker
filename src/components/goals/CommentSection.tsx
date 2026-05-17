"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  action: string;
  newValue: string | null;
  timestamp: string;
  user: { id: string; name: string };
}

interface CommentSectionProps {
  sheetId: string;
}

export function CommentSection({ sheetId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/goal-sheets/${sheetId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/goal-sheets/${sheetId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText.trim() }),
      });

      if (res.ok) {
        setCommentText("");
        await fetchComments();
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmitting(false);
    }
  }

  function parseCommentText(value: string | null): string {
    if (!value) return "";
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? parsed : value;
    } catch {
      return value;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-[13px]">No comments yet</p>
            <p className="text-[11px] mt-0.5">
              Start the conversation below
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <UserAvatar name={comment.user.name} size="xs" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-gray-900">
                    {comment.user.name}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(comment.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-[13px] text-gray-600 mt-0.5 break-words">
                  {parseCommentText(comment.newValue)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {session?.user && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex gap-2 border-t pt-3"
        >
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="text-[13px] min-h-[36px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={!commentText.trim() || submitting}
            className="shrink-0 self-end"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
