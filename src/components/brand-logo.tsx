import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  force?: "light" | "dark";
  align?: "left" | "center";
};

export function BrandLogo({
  className,
  priority,
  force,
  align = "left",
}: BrandLogoProps) {
  const objectAlign = align === "center" ? "object-center" : "object-left";

  return (
    <div className={cn("relative", className)}>
      {force !== "dark" ? (
        <img
          src="/brand/adel-light.png"
          alt="Adel Tech"
          fetchPriority={priority ? "high" : undefined}
          className={cn(
            "absolute inset-0 size-full object-contain",
            objectAlign,
            !force && "dark:hidden"
          )}
        />
      ) : null}
      {force !== "light" ? (
        <img
          src="/brand/adel-dark.png"
          alt="Adel Tech"
          fetchPriority={priority ? "high" : undefined}
          className={cn(
            "absolute inset-0 size-full object-contain",
            objectAlign,
            !force && "hidden dark:block"
          )}
        />
      ) : null}
    </div>
  );
}
