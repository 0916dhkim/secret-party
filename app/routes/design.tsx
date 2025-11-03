import { css } from "@flow-css/core/css";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "../components/Button";
import clsx from "clsx";

export const Route = createFileRoute("/design")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      })}
    >
      <Showcase colorScheme="light" />
      <Showcase colorScheme="dark" />
    </div>
  );
}

function Showcase(props: { colorScheme: "light" | "dark" }) {
  return (
    <div
      className={clsx(
        css(({ v }) => ({
          minHeight: "100dvh",
          color: v("--c-text"),
          backgroundColor: v("--c-bg-dark"),
        })),
        props.colorScheme === "light" && css({ colorScheme: "light" }),
        props.colorScheme === "dark" && css({ colorScheme: "dark" })
      )}
    >
      <ButtonShowcase />
    </div>
  );
}

function ButtonShowcase() {
  const variants = [
    "default",
    "primary",
    "secondary",
    "success",
    "destructive",
    "ghost",
  ] as const;

  return (
    <div
      className={css(() => ({
        padding: "2rem",
      }))}
    >
      <h1
        className={css(({ v }) => ({
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "1.5rem",
        }))}
      >
        Buttons
      </h1>

      {variants.map((variant) => (
        <div
          key={variant}
          className={css({
            marginBlockEnd: "0.5rem",
          })}
        >
          <h2
            className={css(({ v }) => ({
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              textTransform: "capitalize",
            }))}
          >
            {variant}
          </h2>

          <div
            className={css(() => ({
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
            }))}
          >
            <Button variant={variant} size="sm">
              Button
            </Button>
            <Button variant={variant} size="md">
              Button
            </Button>
            <Button variant={variant} size="md" disabled>
              Button
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
