import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error will be attached to confirmPassword field
  });

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;

/**
 * Utility function to parse form data and validate with a Zod schema
 */
export function parseFormData<T>(formData: FormData, schema: z.ZodSchema<T>) {
  const rawData = Object.fromEntries(formData.entries());
  return schema.safeParse(rawData);
}

/**
 * Format Zod validation errors into a user-friendly object
 */
export function formatValidationErrors(zodError: z.ZodError) {
  const fieldErrors: Record<string, string> = {};

  for (const error of zodError.issues) {
    const fieldName = error.path.join(".");
    fieldErrors[fieldName] = error.message;
  }

  return fieldErrors;
}
