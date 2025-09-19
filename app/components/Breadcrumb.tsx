import { Link } from "@tanstack/react-router";
import { css } from "@flow-css/core/css";
// Removed shared imports - styles inlined

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={css({
        backgroundColor: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        padding: "0.75rem 1rem",
      })}
    >
      <div
        className={css({
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.875rem",
        })}
      >
        {items.map((item, index) => (
          <span key={index}>
            {index > 0 && <span className={css({ color: "#9ca3af" })}>•</span>}
            {item.path ? (
              <Link
                to={item.path}
                className={css({
                  color: "#3b82f6",
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                })}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={css({
                  color: "#6b7280",
                  fontWeight: "500",
                })}
              >
                {item.label}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
