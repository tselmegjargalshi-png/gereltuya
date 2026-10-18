import { z } from "zod";

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
  return local.length === 8 ? `${local.slice(0, 4)} ${local.slice(4)}` : local;
}

export const phoneSchema = z
  .string({ required_error: "Утасны дугаараа оруулна уу." })
  .trim()
  .transform(normalizePhone)
  .refine((v) => /^\d{4} \d{4}$/.test(v), "Утасны дугаар 8 оронтой байх ёстой.");

export const emailSchema = z
  .string({ required_error: "И-мэйл хаягаа оруулна уу." })
  .trim()
  .toLowerCase()
  .email("И-мэйл хаяг буруу байна.");

export const passwordSchema = z
  .string({ required_error: "Нууц үгээ оруулна уу." })
  .min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байна.")
  .max(72, "Нууц үг хэт урт байна.")
  .refine((v) => /[A-Za-zА-Яа-яӨөҮүЁё]/.test(v) && /\d/.test(v), "Нууц үг үсэг болон тоо агуулсан байх ёстой.");

export const nameSchema = z
  .string({ required_error: "Нэрээ оруулна уу." })
  .trim()
  .min(2, "Нэр хамгийн багадаа 2 тэмдэгт байна.")
  .max(60, "Нэр хэт урт байна.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Нууц үгээ оруулна уу."),
});

export const registerCustomerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const registerOwnerSchema = registerCustomerSchema;

export type ActionState<T = undefined> = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "ye", ё: "yo", ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
    н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
    щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
