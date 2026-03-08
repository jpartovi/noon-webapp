import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link
        href="/"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
