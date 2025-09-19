import { createFileRoute, redirect } from "@tanstack/react-router";
import { signUp } from "../auth/actions";
import { hasFirstUser } from "../auth/session";
import { signupSchema } from "../auth/validation";
import { css } from "@flow-css/core/css";
import { useForm } from "@tanstack/react-form";
import { clsx } from "clsx";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";

export const Route = createFileRoute("/signup")({
  component: Signup,
  beforeLoad: async () => await beforeLoad(),
  validateSearch: z.object({
    error: z.string().optional(),
  }).parse,
});

const beforeLoad = createServerFn({ method: "GET" }).handler(async () => {
  if (await hasFirstUser()) {
    // If users already exist, redirect to login (block signup completely)
    throw redirect({ to: "/login" });
  }
});

export default function Signup() {
  const { error } = Route.useSearch();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onChange: signupSchema,
    },
  });

  return (
    <div className={Styles.container}>
      <h1>Create Account</h1>
      <p className={Styles.description}>
        Create the first and only account for this system.
      </p>

      <form className={Styles.form} action={signUp.url} method="POST">
        <form.Field name="email">
          {(field) => (
            <div>
              <label htmlFor="email" className={Styles.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={clsx(
                  Styles.input,
                  field.state.meta.errors.length > 0
                    ? Styles.inputInvalid
                    : Styles.inputValid
                )}
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <div className={Styles.errorMessage}>
                    {typeof field.state.meta.errors[0] === "string"
                      ? field.state.meta.errors[0]
                      : (field.state.meta.errors[0] as any)?.message ||
                        "Validation error"}
                  </div>
                )}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div>
              <label htmlFor="password" className={Styles.label}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={clsx(
                  Styles.input,
                  field.state.meta.errors.length > 0
                    ? Styles.inputInvalid
                    : Styles.inputValid
                )}
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <div className={Styles.errorMessage}>
                    {typeof field.state.meta.errors[0] === "string"
                      ? field.state.meta.errors[0]
                      : (field.state.meta.errors[0] as any)?.message ||
                        "Validation error"}
                  </div>
                )}
              {field.state.meta.errors.length === 0 && (
                <small
                  className={css({
                    fontSize: "0.75rem",
                    color: "#666",
                  })}
                >
                  Must be at least 8 characters long with uppercase, lowercase,
                  and number
                </small>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => (
            <div>
              <label htmlFor="confirmPassword" className={Styles.label}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={clsx(
                  Styles.input,
                  field.state.meta.errors.length > 0
                    ? Styles.inputInvalid
                    : Styles.inputValid
                )}
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <div className={Styles.errorMessage}>
                    {typeof field.state.meta.errors[0] === "string"
                      ? field.state.meta.errors[0]
                      : (field.state.meta.errors[0] as any)?.message ||
                        "Validation error"}
                  </div>
                )}
            </div>
          )}
        </form.Field>

        {error && <div className={Styles.generalError}>{error}</div>}

        <form.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <button
              type="submit"
              disabled={!canSubmit}
              className={clsx(
                Styles.button,
                canSubmit ? Styles.buttonEnabled : Styles.buttonDisabled
              )}
            >
              Create Account
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}

const Styles = {
  container: css({
    maxWidth: "400px",
    margin: "0 auto",
    padding: "2rem",
  }),

  description: css({
    marginBottom: "1.5rem",
    color: "#666",
  }),

  form: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }),

  label: css({
    display: "block",
    marginBottom: "0.5rem",
  }),

  errorMessage: css({
    color: "#dc3545",
    fontSize: "0.875rem",
    marginTop: "0.25rem",
  }),

  generalError: css({
    color: "#dc3545",
    fontSize: "0.875rem",
    padding: "0.75rem",
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: "4px",
  }),

  input: css({
    width: "100%",
    padding: "0.5rem",
    borderRadius: "4px",
  }),

  inputValid: css({
    border: "1px solid #ccc",
  }),

  inputInvalid: css({
    border: "1px solid #dc3545",
  }),

  button: css({
    padding: "0.75rem",
    color: "white",
    border: "none",
    borderRadius: "4px",
  }),

  buttonEnabled: css({
    backgroundColor: "#28a745",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#218838",
    },
  }),

  buttonDisabled: css({
    backgroundColor: "#6c757d",
    cursor: "not-allowed",
  }),
};
