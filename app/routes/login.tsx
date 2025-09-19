import { login } from "../auth/actions";
import { loginSchema } from "../auth/validation";
import { css } from "@flow-css/core/css";
import { useForm } from "@tanstack/react-form";
import { clsx } from "clsx";
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
    <div
      className={css({
        maxWidth: "400px",
        margin: "0 auto",
        padding: "2rem",
      })}
    >
      <h1>Login</h1>

      <form
        className={css(({ v }) => ({
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          input: {
            background: v("--c-bg-light"),
          },
        }))}
        action={login.url}
        method="POST"
      >
        <loginForm.Field name="email">
          {(field) => (
            <div>
              <label
                htmlFor="email"
                className={css({
                  display: "block",
                  marginBottom: "0.5rem",
                })}
              >
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
                  <div
                    className={css(({ v }) => ({
                      color: v("--c-danger"),
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                    }))}
                  >
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
              <label
                htmlFor="password"
                className={css({
                  display: "block",
                  marginBottom: "0.5rem",
                })}
              >
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
                  <div
                    className={css(({ v }) => ({
                      color: v("--c-danger"),
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                    }))}
                  >
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
          <div
            className={css(({ v }) => ({
              color: v("--c-danger"),
              fontSize: "0.875rem",
              padding: "0.75rem",
              backgroundColor: v("--c-bg-light"),
              border: `1px solid ${v("--c-border")}`,
              borderRadius: "4px",
            }))}
          >
            {generalError}
          </div>
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

  inputValid: css(({ v }) => ({
    border: `1px solid ${v("--c-border")}`,
  })),

  inputInvalid: css(({ v }) => ({
    border: `1px solid ${v("--c-danger")}`,
  })),

  button: css(({ v }) => ({
    padding: "0.75rem",
    color: v("--c-text-alt"),
    border: "none",
    borderRadius: "4px",
  })),

  buttonEnabled: css(({ v }) => ({
    backgroundColor: v("--c-success"),
    cursor: "pointer",
    "&:hover": {
      backgroundColor: `oklch(from ${v("--c-success")} calc(l - 0.05) c h)`,
    },
  })),

  buttonDisabled: css(({ v }) => ({
    backgroundColor: `oklch(from ${v("--c-success")} l 0 h)`,
    cursor: "not-allowed",
  })),
};
