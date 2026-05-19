"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle,
  Send,
  RotateCcw,
  Clock,
  Trash2,
  ExternalLink,
  CheckCheck,
  Eye,
  EyeOff,
  Loader2,
  Inbox,
  BellOff,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; bg: string; iconColor: string; label: string }
> = {
  GOAL_APPROVED: {
    icon: CheckCircle,
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    label: "Approved",
  },
  GOAL_SUBMITTED: {
    icon: Send,
    bg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    label: "Submitted",
  },
  GOAL_RETURNED: {
    icon: RotateCcw,
    bg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    label: "Returned",
  },
  REMINDER: {
    icon: Clock,
    bg: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    label: "Reminder",
  },
};

const DEFAULT_TYPE_CONFIG = {
  icon: Bell,
  bg: "bg-gray-100 dark:bg-gray-800",
  iconColor: "text-gray-500 dark:text-gray-400",
  label: "Other",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

type TypeFilter = "ALL" | "GOAL_APPROVED" | "GOAL_SUBMITTED" | "GOAL_RETURNED" | "REMINDER";
type ReadFilter = "ALL" | "UNREAD" | "READ";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (reset = true) => {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", reset ? "0" : String(offset + PAGE_SIZE));
        if (typeFilter !== "ALL") params.set("type", typeFilter);
        if (readFilter === "UNREAD") params.set("unread", "true");

        const res = await fetch(`/api/notifications?${params}`);
        if (!res.ok) return;
        const data: NotificationsResponse = await res.json();

        let filtered = data.notifications;
        if (readFilter === "READ") {
          filtered = filtered.filter((n) => n.isRead);
        }

        if (reset) {
          setNotifications(filtered);
        } else {
          setNotifications((prev) => [...prev, ...filtered]);
          setOffset((prev) => prev + PAGE_SIZE);
        }
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [typeFilter, readFilter, offset]
  );

  useEffect(() => {
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, readFilter]);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  const toggleRead = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    }
  };

  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      const wasUnread = notifications.find((n) => n.id === id && !n.isRead);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearRead: true }),
      });
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      setTotal((prev) => prev - (total - unreadCount));
    } catch {
      // Silently fail
    }
  };

  const handleCardClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await toggleRead(notification);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const readCount = total - unreadCount;
  const hasMore = notifications.length < total;

  const typeFilters: { key: TypeFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "GOAL_APPROVED", label: "Approved" },
    { key: "GOAL_SUBMITTED", label: "Submitted" },
    { key: "GOAL_RETURNED", label: "Returned" },
    { key: "REMINDER", label: "Reminders" },
  ];

  const readFilters: { key: ReadFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "UNREAD", label: "Unread" },
    { key: "READ", label: "Read" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
        title="Notifications"
        subtitle="Stay on top of your goal updates and reminders"
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
            {readCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllRead}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear read
              </Button>
            )}
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 card-hover">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
              Total
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <Bell className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {total}
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 px-4 py-3 card-hover stagger-1">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Unread
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/50">
              <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {unreadCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 card-hover stagger-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
              Read
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50">
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {readCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 animate-fade-in-up stagger-1">
        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mr-1">
            Type
          </span>
          {typeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`text-[12px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                typeFilter === f.key
                  ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Read/Unread filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mr-1">
            Status
          </span>
          {readFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setReadFilter(f.key)}
              className={`text-[12px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                readFilter === f.key
                  ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 ring-1 ring-blue-100/50 dark:ring-blue-800/50 mb-3">
            <BellOff className="h-7 w-7 text-blue-400 dark:text-blue-300" />
          </div>
          <p className="text-[15px] font-medium text-gray-700 dark:text-gray-300">
            No notifications
          </p>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {typeFilter !== "ALL" || readFilter !== "ALL"
              ? "Try adjusting your filters"
              : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in-up">
          {notifications.map((notification, idx) => {
            const config =
              TYPE_CONFIG[notification.type] || DEFAULT_TYPE_CONFIG;
            const TypeIcon = config.icon;
            const isDeleting = deletingId === notification.id;

            return (
              <div
                key={notification.id}
                onClick={() => handleCardClick(notification)}
                className={`group relative flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  idx < 10 ? `stagger-${Math.min(idx + 1, 6)}` : ""
                } ${
                  !notification.isRead
                    ? "border-l-[3px] border-l-blue-500 border-t-gray-200 border-r-gray-200 border-b-gray-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-l-blue-400 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800"
                    : "border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800"
                } ${isDeleting ? "opacity-50 scale-[0.98]" : ""}`}
              >
                {/* Type Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg} mt-0.5`}
                >
                  <TypeIcon className={`h-5 w-5 ${config.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[14px] leading-tight ${
                          !notification.isRead
                            ? "font-semibold text-gray-900 dark:text-gray-100"
                            : "font-medium text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bg} ${config.iconColor}`}
                        >
                          {config.label}
                        </span>
                        {!notification.isRead && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRead(notification);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                        title={
                          notification.isRead
                            ? "Already read"
                            : "Mark as read"
                        }
                      >
                        {notification.isRead ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {notification.link && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(notification.link!);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                          title="Open link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNotifications(false)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Inbox className="h-3.5 w-3.5" />
                    Load more ({total - notifications.length} remaining)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
