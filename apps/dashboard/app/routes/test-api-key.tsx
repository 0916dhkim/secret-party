import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { useState } from "react";
import { clsx } from "clsx";
import { createPublicApiClient } from "@secret-party/api/client";

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

function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function extractPublicKeyFromPrivateKey(
  privateKeyBase64: string,
): Promise<string> {
  // Import private key (make it extractable)
  const privateKeyBuffer = base64ToBuffer(privateKeyBase64.trim());
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true, // extractable
    ["decrypt"],
  );

  // Export as JWK to get the public components
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);

  // Create public JWK (remove private components)
  const publicJwk = {
    kty: jwk.kty,
    e: jwk.e,
    n: jwk.n,
    alg: jwk.alg,
    ext: true,
  };

  // Import as public key
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  );

  // Export as SPKI and return as base64
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
}

type TestState =
  | { status: "ready" }
  | { status: "loading" }
  | { status: "error"; message: string; error?: string }
  | {
      status: "loaded";
      message: string;
      environments: Array<{
        id: number;
        name: string;
        projectName: string;
        secretKeys: string[];
      }>;
    };

function TestApiKey() {
  const loaderData = Route.useLoaderData();
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [testState, setTestState] = useState<TestState>({ status: "ready" });

  const handleTest = async () => {
    setTestState({ status: "loading" });

    try {
      // Extract public key from private key
      const publicKeyBase64 =
        await extractPublicKeyFromPrivateKey(privateKeyInput);

      // Create API client with authentication
      const client = createPublicApiClient("", {
        headers: {
          Authorization: `Bearer ${publicKeyBase64}`,
        },
      });

      // Fetch all accessible environments
      const envResponse = await client.api.v1.environments.$get();

      if (!envResponse.ok) {
        const errorText = await envResponse.text();
        let errorMessage = "Unknown error";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorText;
        } catch {
          errorMessage = errorText;
        }
        setTestState({
          status: "error",
          message: `Authentication failed (${envResponse.status})`,
          error: errorMessage,
        });
        return;
      }

      const { environments } = await envResponse.json();

      if (!environments || environments.length === 0) {
        setTestState({
          status: "loaded",
          message:
            "API key authenticated successfully, but no environments have been granted access yet.",
          environments: [],
        });
        return;
      }

      // Fetch secrets for each environment
      const environmentsWithSecrets = await Promise.all(
        environments.map(async (env) => {
          const secretsResponse = await client.api.v1.environments[
            ":environmentId"
          ].secrets.$get({
            param: { environmentId: String(env.id) },
          });

          if (secretsResponse.ok) {
            const { secretKeys } = await secretsResponse.json();
            return {
              id: env.id,
              name: env.name,
              projectName: env.projectName,
              secretKeys,
            };
          } else {
            return {
              id: env.id,
              name: env.name,
              projectName: env.projectName,
              secretKeys: [],
            };
          }
        }),
      );

      setTestState({
        status: "loaded",
        message: `Success! API key authenticated and has access to ${environments.length} environment${environments.length === 1 ? "" : "s"}.`,
        environments: environmentsWithSecrets,
      });
    } catch (error) {
      setTestState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb items={[{ label: "Test API Key" }]} />
      <div className={mainContent}>
        <h1
          className={css({
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          })}
        >
          Test API Key
        </h1>

        <div
          className={css(({ v }) => ({
            fontSize: "0.875rem",
            color: v("--c-text-muted"),
            marginBottom: "2rem",
            padding: "0.75rem",
            backgroundColor: v("--c-bg-light"),
            borderRadius: "6px",
          }))}
        >
          <p style={{ margin: 0 }}>
            <strong>Note:</strong> API keys must be granted access to specific
            environments before they can be used. If you get a 403 error, visit
            the{" "}
            <a
              href="/api-keys"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              API Keys page
            </a>{" "}
            to grant access.
          </p>
        </div>

        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            maxWidth: "800px",
          })}
        >
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
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
              disabled={testState.status === "loading"}
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
                  boxShadow:
                    "0 0 0 2px oklch(from var(--c-primary) l c h / 0.2)",
                },
                "&:disabled": {
                  opacity: 0.6,
                  cursor: "not-allowed",
                },
              }))}
            />
          </div>

          <button
            onClick={handleTest}
            disabled={testState.status === "loading" || !privateKeyInput.trim()}
            className={css(({ v }) => ({
              padding: "0.75rem 1.5rem",
              backgroundColor: v("--c-primary"),
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "opacity 0.2s",
              "&:hover:not(:disabled)": {
                opacity: 0.9,
              },
              "&:disabled": {
                opacity: 0.5,
                cursor: "not-allowed",
              },
            }))}
          >
            {testState.status === "loading" ? "Testing..." : "Test API Key"}
          </button>

          {testState.status === "error" && (
            <div className={clsx(resultStyles.base, resultStyles.error)}>
              <div
                className={
                  testState.error
                    ? resultStyles.messageWithDetails
                    : resultStyles.message
                }
              >
                {testState.message}
              </div>
              {testState.error && (
                <pre className={resultStyles.details}>{testState.error}</pre>
              )}
            </div>
          )}

          {testState.status === "loaded" && (
            <div className={clsx(resultStyles.base, resultStyles.success)}>
              <div
                className={
                  testState.environments.length > 0
                    ? resultStyles.messageWithDetails
                    : resultStyles.message
                }
              >
                {testState.message}
              </div>

              {testState.environments.length > 0 && (
                <div
                  className={css({
                    marginTop: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  })}
                >
                  {testState.environments.map((env) => (
                    <div
                      key={env.id}
                      className={css(({ v }) => ({
                        padding: "0.75rem",
                        backgroundColor: v("--c-bg"),
                        borderRadius: "4px",
                        border: `1px solid ${v("--c-border")}`,
                      }))}
                    >
                      <div
                        className={css({
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          marginBottom: "0.5rem",
                        })}
                      >
                        {env.projectName} / {env.name}
                        <span
                          className={css(({ v }) => ({
                            fontSize: "0.75rem",
                            fontWeight: "400",
                            color: v("--c-text-muted"),
                            marginLeft: "0.5rem",
                          }))}
                        >
                          (ID: {env.id})
                        </span>
                      </div>
                      <div
                        className={css(({ v }) => ({
                          fontSize: "0.75rem",
                          color: v("--c-text-muted"),
                        }))}
                      >
                        <strong>Secrets ({env.secretKeys.length}):</strong>{" "}
                        {env.secretKeys.length > 0
                          ? env.secretKeys.join(", ")
                          : "No secrets"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Static styles for test results
const resultStyles = {
  base: css({
    padding: "1rem",
    borderRadius: "6px",
  }),
  success: css(({ v }) => ({
    border: `1px solid ${v("--c-success-border")}`,
    backgroundColor: v("--c-success-bg"),
  })),
  error: css(({ v }) => ({
    border: `1px solid ${v("--c-error-border")}`,
    backgroundColor: v("--c-error-bg"),
  })),
  message: css(({ v }) => ({
    fontSize: "0.875rem",
    fontWeight: "500",
    color: v("--c-text"),
  })),
  messageWithDetails: css(({ v }) => ({
    fontSize: "0.875rem",
    fontWeight: "500",
    marginBottom: "0.5rem",
    color: v("--c-text"),
  })),
  details: css(({ v }) => ({
    fontSize: "0.75rem",
    fontFamily: "monospace",
    padding: "0.75rem",
    backgroundColor: v("--c-bg"),
    borderRadius: "4px",
    overflow: "auto",
    margin: 0,
  })),
};
