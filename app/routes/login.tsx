import { login } from "../auth/actions";
import { loginSchema } from "../auth/validation";
import { css } from "@flow-css/core/css";
import { useForm } from "@tanstack/react-form";
import { clsx } from "clsx";
import {
  formContainer,
  form,
  label,
  errorMessage,
  generalError as generalErrorStyle,
} from "../styles/shared";
import { hasFirstUser } from "../auth/session";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import z from "zod";

export const Route = createFileRoute("/login")({
  component: Login,
  loader: async () => await loader(),
  validateSearch: z.object({
    error: z.string().optional(),
  }).parse,
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  if (!(await hasFirstUser())) {
    // Redirect the first user to sign up.
    throw redirect({ to: "/signup" });
  }

  return null;
});

export default function Login() {
  const [generalError, setGeneralError] = useState("");

  const loginForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    async onSubmit({ value }) {
      const { error } = await login({ data: value });
      setGeneralError(error);
    },
  });

  return (
    <div className={formContainer}>
      <h1>Login</h1>

      <form className={form} action={login.url} method="POST">
        <loginForm.Field name="email">
          {(field) => (
            <div>
              <label htmlFor="email" className={label}>
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
                  <div className={errorMessage}>
                    {typeof field.state.meta.errors[0] === "string"
                      ? field.state.meta.errors[0]
                      : (field.state.meta.errors[0] as any)?.message ||
                        "Validation error"}
                  </div>
                )}
            </div>
          )}
        </loginForm.Field>

        <loginForm.Field name="password">
          {(field) => (
            <div>
              <label htmlFor="password" className={label}>
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
                  <div className={errorMessage}>
                    {typeof field.state.meta.errors[0] === "string"
                      ? field.state.meta.errors[0]
                      : (field.state.meta.errors[0] as any)?.message ||
                        "Validation error"}
                  </div>
                )}
            </div>
          )}
        </loginForm.Field>

        {generalError && (
          <div className={generalErrorStyle}>{generalError}</div>
        )}

        <loginForm.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <button
              type="submit"
              disabled={!canSubmit}
              className={clsx(
                Styles.button,
                canSubmit ? Styles.buttonEnabled : Styles.buttonDisabled
              )}
            >
              Login
            </button>
          )}
        </loginForm.Subscribe>
      </form>
    </div>
  );
}

const Styles = {
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
    backgroundColor: "#007bff",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#0056b3",
    },
  }),

  buttonDisabled: css({
    backgroundColor: "#6c757d",
    cursor: "not-allowed",
  }),
};
