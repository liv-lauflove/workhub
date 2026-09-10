import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata = {
  title: 'Daftar | Workhub',
  description: 'Daftar akun baru di Workhub Task & Performance Dashboard',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  return <RegisterForm defaultEmail={params.email} />;
}
