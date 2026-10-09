'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileWithTeam } from '../types/profile.types';
import { updateProfileAction } from '../actions/profile.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Briefcase,
  Calendar,
  Check,
  Edit2,
  Gauge,
  Loader2,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfileInfoCardProps {
  profile: ProfileWithTeam;
  userEmail?: string;
}

export function ProfileInfoCard({ profile, userEmail }: ProfileInfoCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [position, setPosition] = useState(profile.position || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [isPending, startTransition] = useTransition();

  const isLeader = profile.role === 'leader';
  const teamName = profile.teams?.name || 'Belum Masuk Tim';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('fullName', fullName.trim());
      formData.set('position', position.trim());
      formData.set('phone', phone.trim());

      const res = await updateProfileAction(formData);
      if (res.success) {
        setIsEditing(false);
        toast.success('Profil berhasil diperbarui!');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal memperbarui profil.');
      }
    });
  };

  const handleCancel = () => {
    setFullName(profile.full_name);
    setPosition(profile.position || '');
    setPhone(profile.phone || '');
    setIsEditing(false);
  };

  return (
    <Card className="border border-border/70 shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-12 w-12 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground border">
                  <UserIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Informasi Pengguna
              </CardTitle>
              <CardDescription className="text-xs">
                Detail akun, peran tim, dan informasi kontak Anda
              </CardDescription>
            </div>
          </div>

          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Profil</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {isEditing ? (
          /* ================= EDIT MODE ================= */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-medium">
                  Nama Lengkap
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isPending}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-xs font-medium">
                  Posisi / Jabatan
                </Label>
                <Input
                  id="position"
                  placeholder="contoh: Senior Frontend Engineer"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  disabled={isPending}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Nomor Telepon
                </Label>
                <Input
                  id="phone"
                  placeholder="contoh: 08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Email Akun (Tidak dapat diubah)
                </Label>
                <Input
                  value={userEmail || profile.email || '-'}
                  disabled
                  className="text-sm bg-muted/40 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
                className="text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="text-xs"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* ================= VIEW MODE ================= */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Full Name */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">
                Nama Lengkap
              </p>
              <p className="mt-1 text-sm font-semibold truncate">
                {profile.full_name}
              </p>
            </div>

            {/* 2. Email */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                Email
              </p>
              <p className="mt-1 text-sm font-medium truncate">
                {userEmail || profile.email || '-'}
              </p>
            </div>

            {/* 3. Role */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                Peran Akun
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isLeader
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-primary/15 text-primary'
                  }`}
                >
                  {isLeader ? 'Leader' : 'Member'}
                </span>
              </div>
            </div>

            {/* 4. Team */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                Tim Kerja
              </p>
              <p className="mt-1 text-sm font-medium">{teamName}</p>
            </div>

            {/* 5. Position */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                Posisi / Jabatan
              </p>
              <p className="mt-1 text-sm font-medium">
                {profile.position || (
                  <span className="text-muted-foreground/60 italic">
                    Belum ditentukan
                  </span>
                )}
              </p>
            </div>

            {/* 6. Capacity Points */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3 text-muted-foreground" />
                Kapasitas Beban
              </p>
              <p className="mt-1 text-sm font-semibold">
                {profile.capacity_points}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  pts
                </span>
              </p>
            </div>

            {/* 7. Phone */}
            {profile.phone && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Telepon
                </p>
                <p className="mt-1 text-sm font-medium">{profile.phone}</p>
              </div>
            )}

            {/* 8. Member Since */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Bergabung Sejak
              </p>
              <p className="mt-1 text-sm font-medium">
                {new Date(profile.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
