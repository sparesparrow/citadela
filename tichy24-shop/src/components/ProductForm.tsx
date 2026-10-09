"use client";

import { useActionState } from "react";
import { saveProductAction, type ProductFormState } from "@/app/admin/actions";

/** Nur fertige Strings (keine Funktionen) — siehe Hinweis in CheckoutForm. */
export interface ProductFormLabels {
  name: string; sku: string; category: string; price: string; stock: string;
  active: string; slug: string; slugHint: string; summary: string;
  description: string; descriptionHint: string; imageUrl: string;
  save: string; saved: string;
}

export function ProductForm({
  productId,
  labels,
  categories,
  initial,
}: {
  productId: string | null;
  labels: ProductFormLabels;
  categories: { id: string; name: string }[];
  initial: Record<string, string>;
}) {
  const action = saveProductAction.bind(null, productId);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {
    errors: {},
    values: initial,
  });
  const v = (k: string) => state.values[k] ?? "";

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className={`field${state.errors[name] ? " field-invalid" : ""}`}>
      <label htmlFor={`p-${name}`}>{label}</label>
      <input id={`p-${name}`} name={name} defaultValue={v(name)} {...props} />
      {hint && !state.errors[name] && <div className="field-hint">{hint}</div>}
      {state.errors[name] && <div className="field-error">{state.errors[name]}</div>}
    </div>
  );

  return (
    <form action={formAction} style={{ maxWidth: 720 }}>
      {state.saved && <div className="notice notice-ok" role="status">{labels.saved}</div>}

      <div className="form-grid">
        <div className="span-2">{field("name", labels.name, { required: true, maxLength: 120 })}</div>
        {field("sku", labels.sku, { required: true, maxLength: 40 })}
        {field("slug", labels.slug, { maxLength: 100 }, labels.slugHint)}
        {field("price", labels.price, { required: true, inputMode: "decimal" })}
        {field("stock", labels.stock, { required: true, type: "number", min: 0, inputMode: "numeric" })}

        <div className={`field${state.errors.categoryId ? " field-invalid" : ""}`}>
          <label htmlFor="p-categoryId">{labels.category}</label>
          <select id="p-categoryId" name="categoryId" defaultValue={v("categoryId")}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {state.errors.categoryId && <div className="field-error">{state.errors.categoryId}</div>}
        </div>
        <div className="field" style={{ alignSelf: "end" }}>
          <label className="inline-check">
            <input type="checkbox" name="active" defaultChecked={v("active") === "on"} />
            {labels.active}
          </label>
        </div>

        <div className="span-2">{field("summary", labels.summary, { required: true, maxLength: 200 })}</div>

        <div className={`field span-2${state.errors.description ? " field-invalid" : ""}`}>
          <label htmlFor="p-description">{labels.description}</label>
          <textarea id="p-description" name="description" rows={7} maxLength={5000} defaultValue={v("description")} />
          <div className="field-hint">{labels.descriptionHint}</div>
          {state.errors.description && <div className="field-error">{state.errors.description}</div>}
        </div>

        <div className="span-2">{field("imageUrl", labels.imageUrl, { type: "url", placeholder: "https://" })}</div>
      </div>

      <button className="btn" type="submit" disabled={pending}>{labels.save}</button>
    </form>
  );
}
