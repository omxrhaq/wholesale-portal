import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(255)
    .or(z.literal(""))
    .optional(),
  phone: z.string().trim().max(50).optional(),
  isActive: z.boolean(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const customerPortalLoginSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type CustomerPortalLoginInput = z.infer<
  typeof customerPortalLoginSchema
>;
