"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordUpdateState = {
  error?: string;
  success?: string;
};

type PasswordUpdateFormProps = {
  action: (
    state: PasswordUpdateState,
    formData: FormData,
  ) => Promise<PasswordUpdateState>;
  loginType?: "wholesaler" | "buyer";
  requireCurrentPassword?: boolean;
  copy: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    updatePassword: string;
    updatingPassword: string;
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

export function PasswordUpdateForm({
  action,
  loginType = "wholesaler",
  requireCurrentPassword = false,
  copy,
}: PasswordUpdateFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="loginType" value={loginType} />

      {requireCurrentPassword ? (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">{copy.currentPassword}</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">{copy.newPassword}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{copy.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
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
        submitLabel={copy.updatePassword}
        submittingLabel={copy.updatingPassword}
      />
    </form>
  );
}
