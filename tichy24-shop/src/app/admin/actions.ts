"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { requireAdmin, signIn, signOut } from "@/auth";
import { SLUG_RE, slugify } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { parseChfToCents } from "@/lib/money";
import { changeOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

/**
 * Kazda server action je verejny POST endpoint — middleware chrani jen
 * stranky pod /admin, ne primo volane akce. Proto hned na zacatku
 * kazde mutace requireAdmin().
 */

/** Presmerovani po prihlaseni jen dovnitr administrace (zadny open redirect). */
function safeRedirect(target: unknown): string {
  const t = typeof target === "string" ? target : "";
  return /^\/admin(\/[\w\-./]*)?$/.test(t) && !t.includes("//") ? t : "/admin";
}

export async function signInAction(formData: FormData): Promise<void> {
  const redirectTo = safeRedirect(formData.get("callbackUrl"));
  try {
    await signIn("staff", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo,
    });
  } catch (err) {
    // Uspesne prihlaseni konci vyhozenym redirectem — ten se musi propustit dal.
    if (err instanceof AuthError) redirect("/admin/login?error=1");
    throw err;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

const statusSchema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["PAID", "FULFILLED", "CANCELLED"]),
});

export async function changeStatusAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) redirect("/admin/login");

  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    to: formData.get("to"),
  });
  if (!parsed.success) redirect("/admin");

  const result = await changeOrderStatus(parsed.data.orderId, parsed.data.to);
  revalidatePath("/admin");
  // Sklad se zmenil -> katalog nesmi ukazovat stare pocty.
  if (parsed.data.to === "CANCELLED") revalidatePath("/shop");
  redirect(`/admin/bestellungen/${parsed.data.orderId}${result === "ok" ? "" : "?error=1"}`);
}

// ---------------------------------------------------------------- Produkty

export interface ProductFormState {
  errors: Partial<Record<string, string>>;
  values: Record<string, string>;
  saved?: boolean;
}

const PRODUCT_FIELDS = [
  "name", "sku", "slug", "summary", "description",
  "price", "stock", "categoryId", "imageUrl", "active",
] as const;

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().regex(/^[A-Za-z0-9._-]{1,40}$/),
  slug: z.string().trim().max(100),
  summary: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  stock: z.coerce.number().int().min(0).max(100_000),
  categoryId: z.string().min(1),
});

export async function saveProductAction(
  productId: string | null,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await requireAdmin())) redirect("/admin/login");

  const dict = await getDictionary();
  const e = dict.admin.products.errors;
  const values: Record<string, string> = {};
  for (const key of PRODUCT_FIELDS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v;
  }
  const errors: Record<string, string> = {};

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      errors[field] =
        field === "stock" ? e.stock : field === "categoryId" ? e.category : e.required;
    }
  }

  const priceCents = parseChfToCents(values.price ?? "");
  if (priceCents === null) errors.price = e.price;

  const slug = (values.slug ?? "").trim() || slugify(values.name ?? "");
  if (!SLUG_RE.test(slug)) errors.slug = e.slug;

  const imageUrl = (values.imageUrl ?? "").trim();
  if (imageUrl && !/^https:\/\/[^\s]+$/.test(imageUrl)) errors.imageUrl = e.imageUrl;

  if (parsed.success && !errors.categoryId) {
    const exists = await prisma.category.count({ where: { id: parsed.data.categoryId } });
    if (!exists) errors.categoryId = e.category;
  }

  if (Object.keys(errors).length > 0 || !parsed.success || priceCents === null) {
    return { errors, values };
  }

  const data = {
    name: parsed.data.name,
    sku: parsed.data.sku,
    slug,
    summary: parsed.data.summary,
    description: parsed.data.description,
    priceCents,
    stock: parsed.data.stock,
    categoryId: parsed.data.categoryId,
    imageUrl: imageUrl || null,
    active: values.active === "on",
  };

  try {
    if (productId) {
      await prisma.product.update({ where: { id: productId }, data });
    } else {
      await prisma.product.create({ data });
    }
  } catch (err) {
    // P2002 = porusena unikatnost (slug nebo sku uz existuje).
    if (typeof err === "object" && err && (err as { code?: string }).code === "P2002") {
      return { errors: { slug: e.duplicate, sku: e.duplicate }, values };
    }
    throw err;
  }

  revalidatePath("/shop");
  revalidatePath("/admin/produkte");
  if (!productId) redirect("/admin/produkte");
  return { errors: {}, values, saved: true };
}
