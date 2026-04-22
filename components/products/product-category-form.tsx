"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  productCategorySchema,
  type ProductCategoryInput,
} from "@/lib/validation/product-category";

type ProductCategoryFormProps = {
  mode: "create" | "edit";
  initialValues?: ProductCategoryInput;
  submitAction: (
    values: ProductCategoryInput,
  ) => Promise<{ success: boolean; error?: string }>;
  copy: {
    newCategory: string;
    editCategory: string;
    formDescription: string;
    name: string;
    saveCategory: string;
    saveChanges: string;
    saveFailed: string;
    saving: string;
    cancel: string;
  };
};

const defaultValues: ProductCategoryInput = {
  name: "",
};

export function ProductCategoryForm({
  mode,
  initialValues = defaultValues,
  submitAction,
  copy,
}: ProductCategoryFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProductCategoryInput>({
    resolver: zodResolver(productCategorySchema),
    defaultValues: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);

    startTransition(async () => {
      const result = await submitAction(values);

      if (!result.success) {
        setServerError(result.error ?? copy.saveFailed);
        return;
      }

      router.push("/dashboard/products/categories?status=saved");
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? copy.newCategory : copy.editCategory}
        </CardTitle>
        <CardDescription>
          {copy.formDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{copy.name}</Label>
            <Input id="name" {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          {serverError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? copy.saving : mode === "create" ? copy.saveCategory : copy.saveChanges}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/products/categories")}
            >
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
