import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[1px]",
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
      <Spinner className="size-4" />
      <span>{label}</span>
      </div>
    </div>
  );
}
