import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    // TEMP (dev): allow common formats (+234..., spaces, dashes). Backend only enforces required/max:20.
    mobile: z
        .string()
        .trim()
        .min(7, "Mobile number seems too short")
        .max(20, "Mobile number is too long")
        .refine((v) => /\d/.test(v), "Mobile number must contain digits"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const profileSchema = z.object({
    full_name: z.string().min(2, "Full Name is required"),
    dob: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }),
    sex: z.enum(['Male', 'Female', 'Other'], { message: "Please select a gender" }),
    occupation: z.string().min(2, "Occupation is required"),
    qualification: z.string().min(2, "Qualification is required"),
    hobbies: z.string().optional(),
    is_smoker: z.boolean().optional(),
    is_drug_user: z.boolean().optional(),
    sexual_orientation: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
