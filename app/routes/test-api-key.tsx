import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { useState } from "react";

export const Route = createFileRoute("/test-api-key")({
  component: TestApiKey,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  return { user: session.user };
});

function TestApiKey() {
  const loaderData = Route.useLoaderData();
  const [privateKeyInput, setPrivateKeyInput] = useState("");

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb items={[{ label: "Test API Key" }]} />
      <div className={mainContent}>
        <h1
          className={css({
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "2rem",
          })}
        >
          Test API Key
        </h1>

        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          })}
        >
          <label
            htmlFor="privateKey"
            className={css(({ v }) => ({
              fontSize: "0.875rem",
              fontWeight: "500",
              color: v("--c-text"),
            }))}
          >
            Private Key
          </label>
          <textarea
            id="privateKey"
            name="privateKey"
            placeholder="Paste your private key here"
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            className={css(({ v }) => ({
              padding: "0.75rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              backgroundColor: v("--c-bg-light"),
              color: v("--c-text"),
              border: `1px solid ${v("--c-border")}`,
              minHeight: "200px",
              resize: "vertical",
              "&:focus": {
                outline: "none",
                borderColor: v("--c-primary"),
                boxShadow: "0 0 0 2px oklch(from var(--c-primary) l c h / 0.2)",
              },
            }))}
          />
        </div>
      </div>
    </Layout>
  );
}
