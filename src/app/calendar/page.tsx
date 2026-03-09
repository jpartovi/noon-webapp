"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "convex/_generated/api";
import { WeekCalendar } from "@/components/calendar/week-calendar";
import { NavBar } from "@/components/nav-bar";

export default function CalendarPage(_props: { params: Promise<unknown>; searchParams: Promise<unknown> }) {
  const router = useRouter();
  const user = useQuery(api.users.getMe);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace("/sign-in");
      return;
    }
    if (!user.isOnboarded) {
      router.replace("/onboarding");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (user === null || !user.isOnboarded) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <NavBar />
      <WeekCalendar />
    </div>
  );
}
