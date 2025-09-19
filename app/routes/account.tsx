import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";

export const Route = createFileRoute("/account")({
  component: Account,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  return { user: session.user };
});

function Account() {
  const loaderData = Route.useLoaderData();

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Account" },
        ]}
      />
      <div className={mainContent}>
        <h1
          className={css({
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "2rem",
          })}
        >
          Account Settings
        </h1>

        {/* Profile Section */}
        <div className={Styles.sectionCard}>
          <h2 className={Styles.sectionTitle}>Profile</h2>

          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            })}
          >
            <div>
              <label
                className={css(({ v }) => ({
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: v("--c-text"),
                  marginBottom: "0.5rem",
                }))}
              >
                Email Address
              </label>
              <input
                type="email"
                value={loaderData.user.email}
                disabled
                className={css(({ v }) => ({
                  width: "100%",
                  maxWidth: "400px",
                  padding: "0.75rem",
                  border: `1px solid ${v("--c-border")}`,
                  borderRadius: "6px",
                  backgroundColor: v("--c-bg-light"),
                  color: v("--c-text-muted"),
                }))}
              />
            </div>

            <div className={css({ marginTop: "1rem" })}>
              <button
                className={clsx(
                  Styles.actionButton,
                  css(({ v }) => ({
                    backgroundColor: v("--c-primary"),
                    color: v("--c-text-alt"),
                    "&:hover": {
                      backgroundColor: `oklch(from ${v(
                        "--c-primary"
                      )} calc(l - 0.05) c h)`,
                    },
                  }))
                )}
              >
                Update Profile
              </button>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className={Styles.sectionCard}>
          <h2 className={Styles.sectionTitle}>Security</h2>

          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            })}
          >
            <div>
              <h3
                className={css(({ v }) => ({
                  fontSize: "1rem",
                  fontWeight: "500",
                  color: v("--c-text"),
                  marginBottom: "0.5rem",
                }))}
              >
                Change Password
              </h3>
              <p
                className={css(({ v }) => ({
                  fontSize: "0.875rem",
                  color: v("--c-text-muted"),
                  marginBottom: "1rem",
                }))}
              >
                Update your password to keep your account secure.
              </p>
              <button
                className={clsx(
                  Styles.actionButton,
                  css(({ v }) => ({
                    backgroundColor: v("--c-warning"),
                    color: v("--c-text-alt"),
                    "&:hover": {
                      backgroundColor: `oklch(from ${v(
                        "--c-warning"
                      )} calc(l - 0.05) c h)`,
                    },
                  }))
                )}
              >
                Change Password
              </button>
            </div>

            <div
              className={css(({ v }) => ({
                borderTop: `1px solid ${v("--c-border")}`,
                paddingTop: "1.5rem",
              }))}
            >
              <h3
                className={css(({ v }) => ({
                  fontSize: "1rem",
                  fontWeight: "500",
                  color: v("--c-text"),
                  marginBottom: "0.5rem",
                }))}
              >
                Account Recovery
              </h3>
              <p
                className={css(({ v }) => ({
                  fontSize: "0.875rem",
                  color: v("--c-text-muted"),
                  marginBottom: "1rem",
                }))}
              >
                Set up recovery options for your account.
              </p>
              <button
                className={clsx(
                  Styles.actionButton,
                  css(({ v }) => ({
                    backgroundColor: v("--c-success"),
                    color: v("--c-text-alt"),
                    "&:hover": {
                      backgroundColor: `oklch(from ${v(
                        "--c-success"
                      )} calc(l - 0.05) c h)`,
                    },
                  }))
                )}
              >
                Setup Recovery
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className={css(({ v }) => ({
            backgroundColor: `oklch(from ${v("--c-danger")} 0.95 0.05 h)`,
            padding: "2rem",
            borderRadius: "8px",
            border: `1px solid oklch(from ${v("--c-danger")} 0.85 0.1 h)`,
          }))}
        >
          <h2
            className={css(({ v }) => ({
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              color: v("--c-danger"),
            }))}
          >
            Danger Zone
          </h2>

          <div>
            <h3
              className={css(({ v }) => ({
                fontSize: "1rem",
                fontWeight: "500",
                color: v("--c-danger"),
                marginBottom: "0.5rem",
              }))}
            >
              Delete Account
            </h3>
            <p
              className={css(({ v }) => ({
                fontSize: "0.875rem",
                color: `oklch(from ${v("--c-danger")} 0.3 c h)`,
                marginBottom: "1rem",
              }))}
            >
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <button
              className={clsx(
                Styles.actionButton,
                css(({ v }) => ({
                  backgroundColor: v("--c-danger"),
                  color: v("--c-text-alt"),
                  "&:hover": {
                    backgroundColor: `oklch(from ${v(
                      "--c-danger"
                    )} calc(l - 0.05) c h)`,
                  },
                }))
              )}
            >
              Delete Account
            </button>
          </div>
        </div>

        <div
          className={css(({ v }) => ({
            backgroundColor: `oklch(from ${v("--c-info")} 0.85 0.1 h)`,
            padding: "1rem",
            borderRadius: "6px",
            border: `1px solid ${v("--c-info")}`,
            marginTop: "2rem",
          }))}
        >
          <p
            className={css(({ v }) => ({
              color: `oklch(from ${v("--c-info")} 0.3 c h)`,
              fontSize: "0.875rem",
            }))}
          >
            This is a placeholder account settings page. The actual
            implementation will include profile management, password changes,
            security settings, and account recovery options.
          </p>
        </div>
      </div>
    </Layout>
  );
}

const Styles = {
  sectionCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    padding: "2rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    marginBottom: "2rem",
  })),
  sectionTitle: css(({ v }) => ({
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    color: v("--c-text"),
  })),
  actionButton: css({
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s",
  }),
};
