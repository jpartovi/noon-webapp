"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "convex/_generated/api";
import { NavBar } from "@/components/nav-bar";

export default function Home() {
  const user = useQuery(api.users.getMe);
  const router = useRouter();

  const isSignedIn = user !== undefined && user !== null;

  return (
    <div className="flex flex-col min-h-screen">
      {isSignedIn && <NavBar />}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">noon</h1>
          <p className="text-muted-foreground">
            See when your people are free.
          </p>
        </div>
        {isSignedIn ? (
          <Button size="lg" onClick={() => router.push("/calendar")}>
            Go to calendar
          </Button>
        ) : (
          <Button size="lg" onClick={() => router.push("/sign-in")}>
            Get started
          </Button>
        )}
      </div>
    </div>
  );
}
