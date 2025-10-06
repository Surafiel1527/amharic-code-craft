import { Skeleton } from "./skeleton";
import { Card } from "./card";

/**
 * Reusable skeleton components for lazy-loaded components
 */

export const ComponentSkeleton = () => (
  <Card className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-32 w-full" />
  </Card>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-48" />
    <div className="grid gap-6 md:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-96" />
  </div>
);

export const EditorSkeleton = () => (
  <div className="space-y-4">
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
    <Skeleton className="h-[600px] w-full" />
  </div>
);

export const ChartSkeleton = () => (
  <Card className="p-6">
    <Skeleton className="h-6 w-32 mb-4" />
    <Skeleton className="h-64 w-full" />
  </Card>
);

export const TableSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
);
