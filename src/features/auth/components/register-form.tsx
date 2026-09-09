'use client';

import * as React from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { register } from '../actions/auth.actions';
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

export function RegisterForm() {
  const [state, formAction] = useActionState<ActionState | null, FormData>(
    register,
    null
  );

  const formErrors =
    state && !state.success && state.error?._form ? state.error._form : null;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Buat Akun Workhub
        </CardTitle>
        <CardDescription>
          Daftarkan akun baru untuk mulai berkolaborasi di Workhub
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
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Contoh: Bima Perkasa"
              required
              autoComplete="name"
            />
            {state && !state.success && state.error?.fullName && (
              <p className="text-xs text-destructive">
                {state.error.fullName.join(', ')}
              </p>
            )}
          </div>

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
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimal 6 karakter"
              required
              autoComplete="new-password"
            />
            {state && !state.success && state.error?.password && (
              <p className="text-xs text-destructive">
                {state.error.password.join(', ')}
              </p>
            )}
          </div>

          <SubmitButton className="w-full" pendingText="Mendaftarkan...">
            Daftar Akun
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
          Sudah memiliki akun?{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Masuk sekarang
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
