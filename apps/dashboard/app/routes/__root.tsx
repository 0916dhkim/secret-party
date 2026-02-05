import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCssUrl from "../app.css?url";
import faviconUrl from "../assets/favicon.ico?url";
import { CSS_VARIABLES } from "../theme";
import { css } from "@flow-css/core/css";

// Have this until React resolve the missing type.
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/73651
// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby
declare module "react" {
  interface DialogHTMLAttributes<T> {
    closedby?: "any" | "closerequest" | "none";
  }
}

if (typeof window !== "undefined") {
  await import("dialog-closedby-polyfill");
}

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
        title: "Secret Party",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCssUrl },
      { rel: "icon", href: faviconUrl },
    ],
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
