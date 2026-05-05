"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  generateCustomerPortalSetupLinkAction,
  sendCustomerPortalSetupEmailAction,
  setupCustomerPortalLoginAction,
} from "@/app/dashboard/customers/actions";
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
    sendPortalSetupEmail: string;
    sendingPortalSetupEmail: string;
    portalSetupEmailSent: string;
    generatePortalSetupLink: string;
    generatingPortalSetupLink: string;
    portalSetupLinkReady: string;
    portalSetupLinkLabel: string;
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
  const [portalSetupLink, setPortalSetupLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSendingEmail, startSendEmailTransition] = useTransition();
  const [isGeneratingLink, startGenerateLinkTransition] = useTransition();
  const form = useForm<CustomerPortalLoginInput>({
    resolver: zodResolver(customerPortalLoginSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setSuccess(null);
    setPortalSetupLink(null);

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

  const sendPortalSetupEmail = () => {
    setServerError(null);
    setSuccess(null);
    setPortalSetupLink(null);

    startSendEmailTransition(async () => {
      const result = await sendCustomerPortalSetupEmailAction(customerId);

      if (!result.success) {
        setServerError(result.error ?? copy.portalLoginFailed);
        return;
      }

      setSuccess(copy.portalSetupEmailSent);
    });
  };

  const generatePortalSetupLink = () => {
    setServerError(null);
    setSuccess(null);
    setPortalSetupLink(null);

    startGenerateLinkTransition(async () => {
      const result = await generateCustomerPortalSetupLinkAction(customerId);

      if (!result.success || !result.portalSetupLink) {
        setServerError(result.error ?? copy.portalLoginFailed);
        return;
      }

      setSuccess(copy.portalSetupLinkReady);
      setPortalSetupLink(result.portalSetupLink);
    });
  };

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
            <span className="font-medium text-foreground">
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
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-100">
              {copy.activateBeforeLogin}
            </p>
          ) : null}

          {serverError ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg border border-sky-200/90 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100">
              {success}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isPending || isSendingEmail || isGeneratingLink || isDisabled}
            >
              {isPending ? copy.savingLogin : copy.setPortalLogin}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || isSendingEmail || isGeneratingLink || isDisabled}
              onClick={sendPortalSetupEmail}
            >
              {isSendingEmail
                ? copy.sendingPortalSetupEmail
                : copy.sendPortalSetupEmail}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || isSendingEmail || isGeneratingLink || isDisabled}
              onClick={generatePortalSetupLink}
            >
              {isGeneratingLink
                ? copy.generatingPortalSetupLink
                : copy.generatePortalSetupLink}
            </Button>
          </div>

          {portalSetupLink ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
              <Label htmlFor="portal-setup-link">{copy.portalSetupLinkLabel}</Label>
              <Input
                id="portal-setup-link"
                readOnly
                value={portalSetupLink}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          ) : null}
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
