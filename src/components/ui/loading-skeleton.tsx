import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "card" | "text" | "avatar" | "button";
}

export const LoadingSkeleton = ({ className, variant = "text" }: LoadingSkeletonProps) => {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  const variantClasses = {
    card: "h-32 w-full",
    text: "h-4 w-full",
    avatar: "h-12 w-12 rounded-full",
    button: "h-10 w-24",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  );
};

export const ProjectCardSkeleton = () => (
  <div className="border rounded-lg p-6 space-y-4 animate-fade-in">
    <LoadingSkeleton variant="text" className="w-3/4" />
    <LoadingSkeleton variant="text" className="w-full" />
    <LoadingSkeleton variant="text" className="w-5/6" />
    <div className="flex gap-2 mt-4">
      <LoadingSkeleton variant="button" />
      <LoadingSkeleton variant="button" />
    </div>
  </div>
);

export const GridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ProjectCardSkeleton key={i} />
    ))}
  </div>
);