import { css } from "@flow-css/core/css";

// Form styles - shared across login and signup forms
export const formContainer = css({
  maxWidth: "400px",
  margin: "0 auto",
  padding: "2rem",
});

export const form = css({
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

export const label = css({
  display: "block",
  marginBottom: "0.5rem",
});

export const errorMessage = css({
  color: "#dc3545",
  fontSize: "0.875rem",
  marginTop: "0.25rem",
});

export const generalError = css({
  color: "#dc3545",
  fontSize: "0.875rem",
  padding: "0.75rem",
  backgroundColor: "#f8d7da",
  border: "1px solid #f5c6cb",
  borderRadius: "4px",
});
