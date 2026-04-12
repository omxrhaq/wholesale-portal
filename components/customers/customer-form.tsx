"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";

type CustomerFormProps = {
  mode: "create" | "edit";
  initialValues?: CustomerInput;
  submitAction: (values: CustomerInput) => Promise<{ success: boolean; error?: string }>;
  copy: {
    newCustomer: string;
    editCustomer: string;
    formDescription: string;
    name: string;
    email: string;
    phone: string;
    activeHelp: string;
    saveCustomer: string;
    saveChanges: string;
    saveFailed: string;
    saving: string;
    cancel: string;
  };
};

const defaultValues: CustomerInput = {
  name: "",
  email: "",
  phone: "",
  isActive: true,
};

export function CustomerForm({
  mode,
  initialValues = defaultValues,
  submitAction,
  copy,
}: CustomerFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
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

      router.push("/dashboard/customers?status=saved");
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? copy.newCustomer : copy.editCustomer}
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
              <Label htmlFor="email">{copy.email}</Label>
              <Input id="email" type="email" {...form.register("email")} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone">{copy.phone}</Label>
              <Input id="phone" {...form.register("phone")} />
              <FieldError message={form.formState.errors.phone?.message} />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <input type="checkbox" className="size-4" {...form.register("isActive")} />
            {copy.activeHelp}
          </label>

          {serverError ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? copy.saving : mode === "create" ? copy.saveCustomer : copy.saveChanges}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/customers")}>
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
