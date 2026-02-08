import { ReactNode } from "react";
import { NavigationMenu } from "./NavigationMenu";
import { css } from "@flow-css/core/css";

interface LayoutProps {
  children: ReactNode;
  userEmail?: string;
  isAdmin?: boolean;
}

export function Layout({ children, userEmail, isAdmin }: LayoutProps) {
  return (
    <div
      className={css({
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      })}
    >
      {userEmail && <NavigationMenu userEmail={userEmail} isAdmin={isAdmin} />}
      {children}
    </div>
  );
}
