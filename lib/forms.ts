import z from 'zod';

export const UserFormSchema = z.object({
  email: z.string().email({message: 'Invalid email address'}),
  password: z
    .string({message: 'Password is required'})
    .min(8, {message: 'Password must be 8 or more characters'}),
});
