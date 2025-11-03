import { css } from "@flow-css/core/css";
import clsx from "clsx";
import { Slot } from "radix-ui";

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "destructive"
  | "ghost";
type ButtonSize = "sm" | "md";

interface Props extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export function Button({
  variant,
  size,
  asChild,
  className,
  children,
  ...forwardProps
}: Props) {
  const Component = asChild ? Slot.Root : "button";

  return (
    <Component
      {...forwardProps}
      className={clsx(
        className,
        Styles.base,
        Styles.variant[variant ?? "default"],
        Styles.size[size ?? "md"]
      )}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
    </Component>
  );
}

const Styles = {
  base: css(() => ({
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    transition: "background-color 0.2s",
    "&[disabled]": {
      cursor: "not-allowed",
    },
  })),
  variant: {
    default: css(({ v }) => ({
      backgroundColor: v("--c-bg-light"),
      color: v("--c-text"),
      "&:hover": {
        backgroundColor: `oklch(from ${v("--c-bg-light")} calc(l - 0.05) c h)`,
      },
      "&[disabled]": {
        backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
      },
    })),
    primary: css(({ v }) => ({
      backgroundColor: v("--c-primary"),
      color: v("--c-text-alt"),
      "&:hover": {
        backgroundColor: `oklch(from ${v("--c-primary")} calc(l - 0.05) c h)`,
      },
      "&[disabled]": {
        backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
      },
    })),
    secondary: css(({ v }) => ({
      backgroundColor: v("--c-bg-light"),
      color: v("--c-text"),
      "&:hover": {
        backgroundColor: `oklch(from ${v("--c-bg-light")} calc(l - 0.05) c h)`,
      },
      "&[disabled]": {
        backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
      },
    })),
    success: css(({ v }) => ({
      backgroundColor: `oklch(from ${v("--c-success")} 0.95 0.05 h)`,
      color: v("--c-text"),
      "&:hover": {
        backgroundColor: `oklch(from ${v("--c-success")} 0.9 0.1 h)`,
      },
      "&[disabled]": {
        backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
      },
    })),
    destructive: css(({ v }) => ({
      backgroundColor: `oklch(from ${v("--c-danger")} 0.95 0.05 h)`,
      color: v("--c-danger"),
      "&:hover": {
        backgroundColor: `oklch(from ${v("--c-danger")} 0.9 0.1 h)`,
      },
      "&[disabled]": {
        backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
      },
    })),
    ghost: css(({ v }) => ({
      color: v("--c-text"),
      "&:hover": {
        backgroundColor: `oklch(from ${v("--c-bg-light")} calc(l - 0.1) c h)`,
      },
      "&[disabled]": {
        color: v("--c-text-muted"),
        "&:hover": {
          backgroundColor: "none",
        },
      },
    })),
  } satisfies Record<ButtonVariant, unknown>,
  size: {
    sm: css(() => ({
      padding: "0.25rem 0.5rem",
      borderRadius: "4px",
      fontSize: "0.75rem",
    })),
    md: css(() => ({
      padding: "0.75rem 1.5rem",
      borderRadius: "6px",
      fontSize: "0.875rem",
    })),
  } satisfies Record<ButtonSize, unknown>,
};
