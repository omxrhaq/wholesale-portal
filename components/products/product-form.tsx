"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { productSchema, type ProductInput } from "@/lib/validation/product";

type ProductFormProps = {
  mode: "create" | "edit";
  initialValues?: ProductInput;
  categoryNames?: string[];
  submitAction: (values: ProductInput) => Promise<{ success: boolean; error?: string }>;
  copy: {
    newProduct: string;
    editProduct: string;
    formDescription: string;
    name: string;
    sku: string;
    category: string;
    uncategorized: string;
    manageCategories: string;
    unit: string;
    price: string;
    description: string;
    activeHelp: string;
    saveProduct: string;
    saveChanges: string;
    saveFailed: string;
    saving: string;
    cancel: string;
  };
};

const defaultValues: ProductInput = {
  name: "",
  sku: "",
  categoryName: "",
  description: "",
  unit: "piece",
  price: 0,
  isActive: true,
};

export function ProductForm({
  mode,
  initialValues = defaultValues,
  categoryNames = [],
  submitAction,
  copy,
}: ProductFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues,
  });
  const categoryOptions = Array.from(
    new Set(
      [
        ...categoryNames,
        initialValues.categoryName,
      ].filter((value): value is string => Boolean(value?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, "en-US"));

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);

    startTransition(async () => {
      const result = await submitAction(values);

      if (!result.success) {
        setServerError(result.error ?? copy.saveFailed);
        return;
      }

      router.push("/dashboard/products?status=saved");
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? copy.newProduct : copy.editProduct}
        </CardTitle>
        <CardDescription>
          {copy.formDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{copy.name}</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">{copy.sku}</Label>
              <Input id="sku" {...form.register("sku")} />
              <FieldError message={form.formState.errors.sku?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryName">{copy.category}</Label>
              <select
                id="categoryName"
                {...form.register("categoryName")}
                className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{copy.uncategorized}</option>
                {categoryOptions.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>
              <div>
                <Link
                  href="/dashboard/products/categories"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {copy.manageCategories}
                </Link>
              </div>
              <FieldError message={form.formState.errors.categoryName?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">{copy.unit}</Label>
              <Input id="unit" {...form.register("unit")} />
              <FieldError message={form.formState.errors.unit?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">{copy.price}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...form.register("price", { valueAsNumber: true })}
              />
              <FieldError message={form.formState.errors.price?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{copy.description}</Label>
            <Textarea id="description" {...form.register("description")} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <input type="checkbox" className="size-4" {...form.register("isActive")} />
            {copy.activeHelp}
          </label>

          {serverError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? copy.saving : mode === "create" ? copy.saveProduct : copy.saveChanges}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/products")}>
              {copy.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}
