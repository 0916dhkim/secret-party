import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { clsx } from "clsx";
import { css } from "@flow-css/core/css";
import { logout } from "../auth/actions";
// Removed shared imports - styles inlined

interface NavigationMenuProps {
  userEmail: string;
}

export function NavigationMenu({ userEmail }: NavigationMenuProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/projects", label: "Projects" },
    { path: "/api-keys", label: "API Keys" },
    { path: "/account", label: "Account" },
  ];

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <nav
      className={css({
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 1rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
      })}
    >
      <div
        className={css({
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "4rem",
        })}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          className={css({
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#111827",
            textDecoration: "none",
          })}
        >
          Secret Party
        </Link>

        {/* Desktop Navigation */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            "@media (max-width: 768px)": {
              display: "none",
            },
          })}
        >
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                css({
                  color: "#6b7280",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "#f3f4f6",
                    color: "#111827",
                  },
                }),
                isActive(item.path) &&
                  css({
                    backgroundColor: "#3b82f6",
                    color: "#ffffff",
                  })
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* User Section */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          })}
        >
          <span
            className={css({
              fontSize: "0.875rem",
              color: "#6b7280",
              "@media (max-width: 768px)": {
                display: "none",
              },
            })}
          >
            {userEmail}
          </span>
          <form
            action={logout.url}
            method="POST"
            className={css({ display: "inline" })}
          >
            <button
              type="submit"
              className={clsx(
                css({
                  color: "#6b7280",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "#f3f4f6",
                    color: "#111827",
                  },
                }),
                css({
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                })
              )}
            >
              Logout
            </button>
          </form>
        </div>

        {/* Mobile menu button */}
        <button
          className={css({
            display: "none",
            backgroundColor: "transparent",
            border: "none",
            padding: "0.5rem",
            borderRadius: "6px",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
            "@media (max-width: 768px)": {
              display: "block",
            },
          })}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <div
        className={css({
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
          display: "none",
          '&[data-open="true"]': {
            display: "block",
          },
        })}
        data-open={isMobileMenuOpen}
      >
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              css({
                display: "block",
                color: "#6b7280",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: "500",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: "#f3f4f6",
                  color: "#111827",
                },
              }),
              isActive(item.path) &&
                css({
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                })
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <div
          className={css({
            borderTop: "1px solid #e5e7eb",
            marginTop: "1rem",
            paddingTop: "1rem",
          })}
        >
          <span
            className={css({
              fontSize: "0.875rem",
              color: "#6b7280",
              padding: "0.75rem 1rem",
            })}
          >
            {userEmail}
          </span>
          <form action={logout.url} method="POST">
            <button
              type="submit"
              className={clsx(
                css({
                  display: "block",
                  color: "#6b7280",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "#f3f4f6",
                    color: "#111827",
                  },
                }),
                css({
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                })
              )}
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
