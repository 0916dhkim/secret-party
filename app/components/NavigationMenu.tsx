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
      className={css(({ v }) => ({
        backgroundColor: `oklch(from ${v("--c-bg-dark")} l c h / 0.8)`,
        backdropFilter: "blur(10px)",
        padding: "0 1rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: v("--shadow"),
      }))}
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
          className={css(({ v }) => ({
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: v("--c-text"),
            textDecoration: "none",
          }))}
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
              data-active={isActive(item.path)}
              className={clsx(
                css(({ v }) => ({
                  color: v("--c-text"),
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: `oklch(from ${v(
                      "--c-bg"
                    )} calc(l - 0.05) c h)`,
                  },
                  '&[data-active="true"]': {
                    backgroundColor: v("--c-primary"),
                    color: v("--c-text-alt"),
                    "&:hover": {
                      backgroundColor: `oklch(from ${v(
                        "--c-primary"
                      )} calc(l - 0.05) c h)`,
                    },
                  },
                }))
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
            className={css(({ v }) => ({
              fontSize: "0.875rem",
              color: v("--c-text-muted"),
              "@media (max-width: 768px)": {
                display: "none",
              },
            }))}
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
              className={css(({ v }) => ({
                backgroundColor: v("--c-bg-light"),
                border: `1px solid ${v("--c-border")}`,
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: `oklch(from ${v(
                    "--c-bg-light"
                  )} calc(l - 0.05) c h)`,
                },
                "@media (max-width: 768px)": {
                  display: "none",
                },
              }))}
            >
              Logout
            </button>
          </form>
        </div>

        {/* Mobile menu button */}
        <button
          className={css(({ v }) => ({
            display: "none",
            backgroundColor: "transparent",
            border: "none",
            padding: "0.5rem",
            borderRadius: "6px",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: `oklch(from ${v("--c-bg")} calc(l - 0.05) c h)`,
            },
            "@media (max-width: 768px)": {
              display: "block",
            },
          }))}
          onClick={() => setIsMobileMenuOpen((original) => !original)}
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
        className={css(({ v }) => ({
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: v("--c-bg"),
          borderBottom: `1px solid ${v("--c-border")}`,
          padding: "1rem",
          display: "none",
          '&[data-open="true"]': {
            display: "block",
          },
        }))}
        data-open={isMobileMenuOpen}
      >
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              css(({ v }) => ({
                display: "block",
                color: v("--c-text"),
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: "500",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: `oklch(from ${v(
                    "--c-bg"
                  )} calc(l - 0.05) c h)`,
                  color: v("--c-text"),
                },
              })),
              isActive(item.path) &&
                css(({ v }) => ({
                  backgroundColor: v("--c-primary"),
                  color: v("--c-text-alt"),
                }))
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <div
          className={css(({ v }) => ({
            borderTop: `1px solid ${v("--c-border")}`,
            marginTop: "1rem",
            paddingTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }))}
        >
          <span
            className={css(({ v }) => ({
              fontSize: "0.875rem",
              color: v("--c-text-muted"),
            }))}
          >
            {userEmail}
          </span>
          <form action={logout.url} method="POST">
            <button
              type="submit"
              className={css(({ v }) => ({
                display: "block",
                backgroundColor: v("--c-bg-light"),
                border: `1px solid ${v("--c-border")}`,
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                transition: "all 0.2s",
                width: "100%",
                textAlign: "left",
                "&:hover": {
                  backgroundColor: `oklch(from ${v(
                    "--c-bg-light"
                  )} calc(l - 0.05) c h)`,
                },
              }))}
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
