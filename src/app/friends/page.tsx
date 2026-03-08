"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/nav-bar";
import { cn } from "@/lib/utils";

export default function FriendsPage(_props: { params: Promise<unknown>; searchParams: Promise<unknown> }) {
  const router = useRouter();
  const user = useQuery(api.users.getMe);
  const inbound = useQuery(api.friends.listInboundRequests);
  const friends = useQuery(api.friends.listFriends);
  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const respondToRequest = useMutation(api.friends.respondToFriendRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await sendFriendRequest({ phone: phone.trim() });
      if (result.success) {
        setMessage({ type: "success", text: "Friend request sent." });
        setPhone("");
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to send request" });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to send request",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (friendshipId: Id<"friendships">, accept: boolean) => {
    setMessage(null);
    try {
      await respondToRequest({ friendshipId, accept });
      setMessage({
        type: "success",
        text: accept ? "Request accepted." : "Request declined.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const handleRemove = async (friendshipId: Id<"friendships">) => {
    setMessage(null);
    try {
      await removeFriend({ friendshipId });
      setMessage({ type: "success", text: "Friend removed." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-xl font-semibold tracking-tight">Friends</h1>

        {message && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              message.type === "success"
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            )}
            role="alert"
          >
            {message.text}
          </div>
        )}

        {inbound && inbound.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-foreground">
              Inbound invitations
            </h2>
            <ul className="space-y-2">
              {inbound.map((req) => (
                <li
                  key={req._id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="text-sm font-medium">{req.initiatorName}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespond(req._id, false)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRespond(req._id, true)}
                    >
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Your friends
          </h2>
          {friends === undefined ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li
                  key={f._id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="text-sm font-medium">{f.friendName}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemove(f._id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Invite
          </h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="tel"
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cn(
                "flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              required
              disabled={loading}
              autoComplete="tel"
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
