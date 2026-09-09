'use client';

import * as React from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '../actions/auth.actions';
import { OAuthButtons } from './oauth-buttons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/forms/submit-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ActionState } from '@/types/global';

export function LoginForm() {
  const [state, formAction] = useActionState<ActionState | null, FormData>(
    login,
    null
  );

  const formErrors =
    state && !state.success && state.error?._form ? state.error._form : null;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Masuk ke Workhub
        </CardTitle>
        <CardDescription>
          Masukkan email dan kata sandi Anda untuk mengakses dashboard
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {formErrors && (
          <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {formErrors.map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@workhub.com"
              required
              autoComplete="email"
            />
            {state && !state.success && state.error?.email && (
              <p className="text-xs text-destructive">
                {state.error.email.join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Kata Sandi</Label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            {state && !state.success && state.error?.password && (
              <p className="text-xs text-destructive">
                {state.error.password.join(', ')}
              </p>
            )}
          </div>

          <SubmitButton className="w-full" pendingText="Memverifikasi...">
            Masuk
          </SubmitButton>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              atau lanjutkan dengan
            </span>
          </div>
        </div>

        <OAuthButtons />
      </CardContent>

      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Belum memiliki akun?{' '}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
