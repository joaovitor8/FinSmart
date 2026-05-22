import { Skeleton } from "@/src/components/ui/skeleton";
import { AppShell } from "@/src/components/app-shell";

export default function Loading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-40 bg-secondary" />
          <Skeleton className="h-4 w-64 bg-secondary mt-2" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-20 bg-secondary" />
                <Skeleton className="h-8 w-8 rounded-lg bg-secondary" />
              </div>
              <Skeleton className="h-8 w-32 bg-secondary" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-4 w-40 bg-secondary mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg bg-secondary shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 bg-secondary" />
                    <Skeleton className="h-3 w-20 bg-secondary mt-1.5" />
                  </div>
                  <Skeleton className="h-4 w-24 bg-secondary" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-4 w-36 bg-secondary mb-6" />
            <Skeleton className="h-50 w-50 rounded-full bg-secondary mx-auto" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
