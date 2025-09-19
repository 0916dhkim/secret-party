import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCssUrl from "../app.css?url";
import { CSS_VARIABLES } from "../theme";
import { css } from "@flow-css/core/css";

const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </QueryClientProvider>
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
