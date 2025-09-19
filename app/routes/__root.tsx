import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCssUrl from "../app.css?url";
import { CSS_VARIABLES } from "../theme";
import { css } from "@flow-css/core/css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [{ rel: "stylesheet", href: appCssUrl }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body
        style={CSS_VARIABLES as React.CSSProperties}
        className={css(({ v }) => ({
          colorScheme: "light dark",
          background: v("--c-bg-dark"),
          color: v("--c-text"),
        }))}
      >
        {children}
        <Scripts />
      </body>
    </html>
  );
}
