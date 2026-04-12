"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { setupCustomerPortalLoginAction } from "@/app/dashboard/customers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  customerPortalLoginSchema,
  type CustomerPortalLoginInput,
} from "@/lib/validation/customer";

type CustomerPortalLoginFormProps = {
  customerId: string;
  customerEmail: string | null;
  isActive: boolean;
  copy: {
    portalLogin: string;
    portalLoginDescription: string;
    loginEmail: string;
    addEmailFirst: string;
    password: string;
    activateBeforeLogin: string;
    portalLoginReady: string;
    setPortalLogin: string;
    savingLogin: string;
    portalLoginFailed: string;
  };
};

export function CustomerPortalLoginForm({
  customerId,
  customerEmail,
  isActive,
  copy,
}: CustomerPortalLoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CustomerPortalLoginInput>({
    resolver: zodResolver(customerPortalLoginSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await setupCustomerPortalLoginAction(customerId, values);

      if (!result.success) {
        setServerError(result.error ?? copy.portalLoginFailed);
        return;
      }

      form.reset({ password: "" });
      setSuccess(copy.portalLoginReady);
    });
  });

  const isDisabled = !customerEmail || !isActive;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.portalLogin}</CardTitle>
        <CardDescription>
          {copy.portalLoginDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {copy.loginEmail}:{" "}
            <span className="font-medium text-slate-950">
              {customerEmail ?? copy.addEmailFirst}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal-password">{copy.password}</Label>
            <Input
              id="portal-password"
              type="password"
              autoComplete="new-password"
              disabled={isDisabled}
              {...form.register("password")}
            />
            <FieldError message={form.formState.errors.password?.message} />
          </div>

          {!isActive ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {copy.activateBeforeLogin}
            </p>
          ) : null}

          {serverError ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending || isDisabled}>
            {isPending ? copy.savingLogin : copy.setPortalLogin}
          </Button>
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
