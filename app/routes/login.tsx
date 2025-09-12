import { login } from "../auth/actions";
import { loginSchema } from "../auth/validation";
import type { Route } from "./+types/login";
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

export async function loader(args: Route.LoaderArgs) {
  if (!(await hasFirstUser())) {
    // Redirect the first user to sign up.
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/signup",
      },
    });
  }

  return null;
}

export async function action(args: Route.ActionArgs) {
  const formData = await args.request.formData();
  return login(formData);
}

export default function Login({ actionData }: Route.ComponentProps) {
  const generalError = actionData?.error;

  const loginForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
  });

  return (
    <div className={formContainer}>
      <h1>Login</h1>

      <form className={form} method="post">
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
