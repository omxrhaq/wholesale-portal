"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginState = {
  error?: string;
};

type LoginFormProps = {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  next?: string;
  copy: {
    email: string;
    password: string;
    submit: string;
    submitting: string;
    forgotPassword: string;
  };
  forgotPasswordHref: string;
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

export function LoginForm({
  action,
  next,
  copy,
  forgotPasswordHref,
}: LoginFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="email">{copy.email}</Label>
        <Input id="email" name="email" type="email" placeholder="name@company.com" required />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">{copy.password}</Label>
          <Link
            href={forgotPasswordHref}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {copy.forgotPassword}
          </Link>
        </div>
        <Input id="password" name="password" type="password" required />
      </div>

      {state.error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        submitLabel={copy.submit}
        submittingLabel={copy.submitting}
      />
    </form>
  );
}
