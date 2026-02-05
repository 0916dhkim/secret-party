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
      backgroundColor: v("--c-button-default-background"),
      color: v("--c-button-default-text"),
      "&:hover": {
        backgroundColor: v("--c-button-default-hover-background"),
      },
      "&[disabled]": {
        backgroundColor: v("--c-button-default-disabled-background"),
        color: v("--c-button-default-disabled-text"),
      },
    })),
    primary: css(({ v }) => ({
      backgroundColor: v("--c-button-primary-background"),
      color: v("--c-button-primary-text"),
      "&:hover": {
        backgroundColor: v("--c-button-primary-hover-background"),
      },
      "&[disabled]": {
        backgroundColor: v("--c-button-primary-disabled-background"),
        color: v("--c-button-primary-disabled-text"),
      },
    })),
    secondary: css(({ v }) => ({
      backgroundColor: v("--c-button-secondary-background"),
      border: `1px solid ${v("--c-button-secondary-border")}`,
      color: v("--c-button-secondary-text"),
      "&:hover": {
        backgroundColor: v("--c-button-secondary-hover-background"),
      },
      "&[disabled]": {
        backgroundColor: v("--c-button-secondary-disabled-background"),
        border: "none",
        color: v("--c-button-secondary-disabled-text"),
      },
    })),
    success: css(({ v }) => ({
      backgroundColor: v("--c-button-success-background"),
      color: v("--c-button-success-text"),
      "&:hover": {
        backgroundColor: v("--c-button-success-hover-background"),
      },
      "&[disabled]": {
        backgroundColor: v("--c-button-success-disabled-background"),
        color: v("--c-button-success-disabled-text"),
      },
    })),
    destructive: css(({ v }) => ({
      backgroundColor: v("--c-button-destructive-background"),
      color: v("--c-button-destructive-text"),
      "&:hover": {
        backgroundColor: v("--c-button-destructive-hover-background"),
      },
      "&[disabled]": {
        backgroundColor: v("--c-button-destructive-disabled-background"),
        color: v("--c-button-destructive-disabled-text"),
      },
    })),
    ghost: css(({ v }) => ({
      color: v("--c-button-ghost-text"),
      "&:hover": {
        backgroundColor: v("--c-button-ghost-hover-background"),
      },
      "&[disabled]": {
        color: v("--c-button-ghost-disabled-text"),
        "&:hover": {
          backgroundColor: "transparent",
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
