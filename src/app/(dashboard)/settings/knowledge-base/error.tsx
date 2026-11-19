'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function KnowledgeBaseError({ reset }: { reset: () => void }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-3 rounded-lg border bg-card p-4 sm:p-6">
      <p role="alert" className="font-medium">
        Panduan tim gagal dimuat.
      </p>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => {
          router.refresh();
          reset();
        }}
      >
        Muat ulang
      </Button>
    </div>
  );
}
