import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "Jersey",
  "T shirt",
  "Polo shirt",
  "Long sleeve",
  "Uniform",
  "Other",
] as const;

const nonNegativeNumberMessage = "Must be a valid non-negative number";
const nonNegativeIntegerMessage = "Must be a valid non-negative whole number";

const nonNegativeNumberString = z
  .string()
  .trim()
  .min(1, "This field is required")
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, nonNegativeNumberMessage);

const nonNegativeIntegerString = z
  .string()
  .trim()
  .min(1, "This field is required")
  .refine((value) => /^\d+$/.test(value), nonNegativeIntegerMessage);

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address").trim(),
  password: z.string().min(1, "Password is required"),
});

export const addProductFormSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required"),
    description: z.string(),
    selectedCategory: z.enum(PRODUCT_CATEGORIES),
    customCategory: z.string(),
    basePrice: nonNegativeNumberString,
    reorderLevel: nonNegativeIntegerString,
    image: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.selectedCategory === "Other" && !value.customCategory.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customCategory"],
        message: "Category name is required",
      });
    }
  });

export const editProductFormSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required"),
    description: z.string(),
    selectedCategory: z.enum(PRODUCT_CATEGORIES),
    customCategory: z.string(),
    basePrice: nonNegativeNumberString,
    image: z.string().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.selectedCategory === "Other" && !value.customCategory.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customCategory"],
        message: "Category name is required",
      });
    }
  });

export const addVariantFormSchema = z.object({
  size: z.string().trim().min(1, "Size is required"),
  color: z.string().trim().min(1, "Color is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  variantPrice: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0;
    }, nonNegativeNumberMessage),
  image: z.string().nullable(),
});
