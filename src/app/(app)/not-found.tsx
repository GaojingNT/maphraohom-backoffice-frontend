import NotFoundView from "@/components/ui/not-found-view";

// Shown inside the app shell (with the bottom nav) when a bill or store id
// doesn't exist (spec F13 — the stock Next.js 404 was never designed).
export default function AppNotFound() {
  return <NotFoundView />;
}
