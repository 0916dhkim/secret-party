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
                className={css({
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                })}
              >
                Email Address
              </label>
              <input
                type="email"
                value={loaderData.user.email}
                disabled
                className={css({
                  width: "100%",
                  maxWidth: "400px",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: "#f9fafb",
                  color: "#6b7280",
                })}
              />
            </div>

            <div className={css({ marginTop: "1rem" })}>
              <button
                className={clsx(
                  Styles.actionButton,
                  css({
                    backgroundColor: "#3b82f6",
                    color: "white",
                  })
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
                className={css({
                  fontSize: "1rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                })}
              >
                Change Password
              </h3>
              <p
                className={css({
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem",
                })}
              >
                Update your password to keep your account secure.
              </p>
              <button
                className={clsx(
                  Styles.actionButton,
                  css({
                    backgroundColor: "#f59e0b",
                    color: "white",
                  })
                )}
              >
                Change Password
              </button>
            </div>

            <div
              className={css({
                borderTop: "1px solid #f3f4f6",
                paddingTop: "1.5rem",
              })}
            >
              <h3
                className={css({
                  fontSize: "1rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                })}
              >
                Account Recovery
              </h3>
              <p
                className={css({
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem",
                })}
              >
                Set up recovery options for your account.
              </p>
              <button
                className={clsx(
                  Styles.actionButton,
                  css({
                    backgroundColor: "#10b981",
                    color: "white",
                  })
                )}
              >
                Setup Recovery
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className={css({
            backgroundColor: "#fef2f2",
            padding: "2rem",
            borderRadius: "8px",
            border: "1px solid #fecaca",
          })}
        >
          <h2
            className={css({
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              color: "#dc2626",
            })}
          >
            Danger Zone
          </h2>

          <div>
            <h3
              className={css({
                fontSize: "1rem",
                fontWeight: "500",
                color: "#dc2626",
                marginBottom: "0.5rem",
              })}
            >
              Delete Account
            </h3>
            <p
              className={css({
                fontSize: "0.875rem",
                color: "#7f1d1d",
                marginBottom: "1rem",
              })}
            >
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <button
              className={clsx(
                Styles.actionButton,
                css({
                  backgroundColor: "#dc2626",
                  color: "white",
                })
              )}
            >
              Delete Account
            </button>
          </div>
        </div>

        <div
          className={css({
            backgroundColor: "#f0f9ff",
            padding: "1rem",
            borderRadius: "6px",
            border: "1px solid #0ea5e9",
            marginTop: "2rem",
          })}
        >
          <p className={css({ color: "#0c4a6e", fontSize: "0.875rem" })}>
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
  sectionCard: css({
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    marginBottom: "2rem",
  }),
  sectionTitle: css({
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    color: "#111827",
  }),
  actionButton: css({
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  }),
};
