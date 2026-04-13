import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.email("Please enter a valid email address."),
  loginType: z.enum(["wholesaler", "buyer"]).default("wholesaler"),
});

export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;

export const passwordUpdateSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters."),
    loginType: z.enum(["wholesaler", "buyer"]).default("wholesaler"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;

export const passwordChangeSchema = passwordUpdateSchema.extend({
  currentPassword: z
    .string()
    .min(8, "Current password must be at least 8 characters."),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
