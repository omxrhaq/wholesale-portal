"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordState = {
  error?: string;
  success?: string;
};

type ForgotPasswordFormProps = {
  action: (
    state: ForgotPasswordState,
    formData: FormData,
  ) => Promise<ForgotPasswordState>;
  loginType: "wholesaler" | "buyer";
  copy: {
    email: string;
    sendResetLink: string;
    sendingResetLink: string;
  };
};

function SubmitButton({
  submitLabel,
  submittingLabel,
}: {
  submitLabel: string;
  submittingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? submittingLabel : submitLabel}
    </Button>
  );
}

export function ForgotPasswordForm({
  action,
  loginType,
  copy,
}: ForgotPasswordFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="loginType" value={loginType} />

      <div className="space-y-2">
        <Label htmlFor="email">{copy.email}</Label>
        <Input id="email" name="email" type="email" placeholder="name@company.com" required />
      </div>

      {state.error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}

      <SubmitButton
        submitLabel={copy.sendResetLink}
        submittingLabel={copy.sendingResetLink}
      />
    </form>
  );
}
