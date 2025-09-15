import { css } from "@flow-css/core/css";
import { useState } from "react";
import { logout } from "../auth/actions";

export interface NavigationMenuProps {
  currentPath: string;
  userEmail: string;
}

export function NavigationMenu({ currentPath, userEmail }: NavigationMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={styles.desktopNav}>
        <div className={styles.navContainer}>
          <div className={styles.brand}>
            <a href="/dashboard" className={styles.brandLink}>
              Secret Party
            </a>
          </div>
          
          <div className={styles.navLinks}>
            <a 
              href="/dashboard" 
              className={`${styles.navLink} ${isActive("/dashboard") ? styles.navLinkActive : ""}`}
            >
              Dashboard
            </a>
            <a 
              href="/projects" 
              className={`${styles.navLink} ${isActive("/projects") ? styles.navLinkActive : ""}`}
            >
              Projects
            </a>
            <a 
              href="/api-keys" 
              className={`${styles.navLink} ${isActive("/api-keys") ? styles.navLinkActive : ""}`}
            >
              API Keys
            </a>
          </div>

          <div className={styles.userMenu}>
            <span className={styles.userEmail}>{userEmail}</span>
            <form action={logout.url} method="POST" className={styles.logoutForm}>
              <button type="submit" className={styles.logoutButton}>
                Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className={styles.mobileNav}>
        <div className={styles.mobileNavContainer}>
          <div className={styles.brand}>
            <a href="/dashboard" className={styles.brandLink}>
              Secret Party
            </a>
          </div>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={styles.menuToggle}
          >
            ☰
          </button>
        </div>

        {isMenuOpen && (
          <div className={styles.mobileMenu}>
            <a 
              href="/dashboard" 
              className={`${styles.mobileNavLink} ${isActive("/dashboard") ? styles.mobileNavLinkActive : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </a>
            <a 
              href="/projects" 
              className={`${styles.mobileNavLink} ${isActive("/projects") ? styles.mobileNavLinkActive : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Projects
            </a>
            <a 
              href="/api-keys" 
              className={`${styles.mobileNavLink} ${isActive("/api-keys") ? styles.mobileNavLinkActive : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              API Keys
            </a>
            <div className={styles.mobileUserInfo}>
              <span className={styles.mobileUserEmail}>{userEmail}</span>
              <form action={logout.url} method="POST">
                <button type="submit" className={styles.mobileLogoutButton}>
                  Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

const styles = {
  // Desktop Navigation
  desktopNav: css({
    backgroundColor: "white",
    borderBottom: "1px solid #e9ecef",
    padding: "1rem 0",
    "@media (max-width: 768px)": {
      display: "none",
    },
  }),

  navContainer: css({
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),

  brand: css({
    flex: 1,
  }),

  brandLink: css({
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#007bff",
    textDecoration: "none",
    "&:hover": {
      color: "#0056b3",
    },
  }),

  navLinks: css({
    display: "flex",
    gap: "2rem",
    flex: 2,
    justifyContent: "center",
  }),

  navLink: css({
    color: "#495057",
    textDecoration: "none",
    fontWeight: "500",
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: "#f8f9fa",
      color: "#007bff",
    },
  }),

  navLinkActive: css({
    backgroundColor: "#007bff",
    color: "white",
    "&:hover": {
      backgroundColor: "#0056b3",
      color: "white",
    },
  }),

  userMenu: css({
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flex: 1,
    justifyContent: "flex-end",
  }),

  userEmail: css({
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  logoutForm: css({
    margin: 0,
  }),

  logoutButton: css({
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#c82333",
    },
  }),

  // Mobile Navigation
  mobileNav: css({
    backgroundColor: "white",
    borderBottom: "1px solid #e9ecef",
    "@media (min-width: 769px)": {
      display: "none",
    },
  }),

  mobileNavContainer: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
  }),

  menuToggle: css({
    backgroundColor: "transparent",
    border: "1px solid #e9ecef",
    borderRadius: "4px",
    padding: "0.5rem 0.75rem",
    fontSize: "1.2rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f8f9fa",
    },
  }),

  mobileMenu: css({
    backgroundColor: "#f8f9fa",
    borderTop: "1px solid #e9ecef",
    padding: "1rem",
  }),

  mobileNavLink: css({
    display: "block",
    color: "#495057",
    textDecoration: "none",
    fontWeight: "500",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "0.5rem",
    "&:hover": {
      backgroundColor: "white",
      color: "#007bff",
    },
  }),

  mobileNavLinkActive: css({
    backgroundColor: "#007bff",
    color: "white",
    "&:hover": {
      backgroundColor: "#0056b3",
      color: "white",
    },
  }),

  mobileUserInfo: css({
    borderTop: "1px solid #e9ecef",
    marginTop: "1rem",
    paddingTop: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),

  mobileUserEmail: css({
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  mobileLogoutButton: css({
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#c82333",
    },
  }),
};