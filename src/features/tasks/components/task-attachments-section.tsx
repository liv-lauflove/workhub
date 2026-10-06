'use client';

import * as React from 'react';
import {
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MAX_TASK_ATTACHMENT_SIZE_LABEL,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  formatAttachmentFileSize,
  validateTaskAttachmentFile,
} from '@/lib/storage';
import {
  uploadTaskAttachmentAction,
  deleteTaskAttachmentAction,
  getAttachmentSignedUrlAction,
} from '../actions/task.actions';
import type { TaskDetail, TaskAttachmentItem } from '../types/task.types';

interface TaskAttachmentsSectionProps {
  task: TaskDetail;
  initialAttachments?: TaskAttachmentItem[];
  currentUserId?: string;
  isLeader?: boolean;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatUploadDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getFileIcon(mimeType?: string | null, fileName?: string) {
  const type = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return <FileText className="h-5 w-5 text-rose-500 shrink-0" />;
  }
  if (
    type.includes('image') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp')
  ) {
    return <ImageIcon className="h-5 w-5 text-sky-500 shrink-0" />;
  }
  return <File className="h-5 w-5 text-muted-foreground shrink-0" />;
}

export function TaskAttachmentsSection({
  task,
  initialAttachments = [],
  currentUserId,
  isLeader = false,
}: TaskAttachmentsSectionProps) {
  const [attachments, setAttachments] =
    React.useState<TaskAttachmentItem[]>(initialAttachments);
  const [prevInitialAttachments, setPrevInitialAttachments] =
    React.useState(initialAttachments);

  // Sync prop changes during render without triggering cascading effects
  if (initialAttachments !== prevInitialAttachments) {
    setPrevInitialAttachments(initialAttachments);
    setAttachments(initialAttachments);
  }

  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    // 1. Client-side Validation (Strict 5MB limit check as per AC)
    const validation = validateTaskAttachmentFile({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!validation.valid) {
      const errorMsg =
        validation.error ||
        `Berkas "${file.name}" melebihi batas ${MAX_TASK_ATTACHMENT_SIZE_LABEL}. Berkas otomatis ditolak.`;
      toast.error(errorMsg);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(`Mengunggah "${file.name}"...`);

      // 2. Upload and record attachment via Server Action
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', task.id);
      if (task.project_id) {
        formData.append('projectId', task.project_id);
      }

      const res = await uploadTaskAttachmentAction(formData);

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal menyimpan lampiran di database.';
        throw new Error(errorMsg);
      }

      if (!res.data) {
        throw new Error('Data lampiran tidak ditemukan.');
      }

      const newAttachment = res.data;
      setAttachments((prev) => [newAttachment, ...prev]);
      toast.success(`Berkas "${file.name}" berhasil diunggah.`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengunggah berkas.';
      toast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDownload = async (attachment: TaskAttachmentItem) => {
    try {
      setDownloadingId(attachment.id);
      const res = await getAttachmentSignedUrlAction(attachment.file_url);

      if (!res.success || !res.signedUrl) {
        toast.error(res.error || 'Gagal mendapatkan tautan berkas.');
        return;
      }

      // Open signed URL in new tab / window
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal membuka lampiran.';
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachment: TaskAttachmentItem) => {
    const confirmed = confirm(
      `Apakah Anda yakin ingin menghapus lampiran "${attachment.file_name}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(attachment.id);
      const res = await deleteTaskAttachmentAction({
        attachmentId: attachment.id,
        taskId: task.id,
        fileUrl: attachment.file_url,
        projectId: task.project_id,
      });

      if (!res.success) {
        toast.error(res.error?._form?.[0] || 'Gagal menghapus lampiran.');
        return;
      }

      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast.success('Lampiran berhasil dihapus.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal menghapus lampiran.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
          <Paperclip className="h-4 w-4 text-primary" />
          <span>Lampiran & Berkas</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {attachments.length}
          </span>
        </div>

        <span className="text-[11px] text-muted-foreground">
          Maks. {MAX_TASK_ATTACHMENT_SIZE_LABEL} per file (PDF, JPG, PNG, WebP)
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(',')}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110 mb-3 shadow-2xs">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="h-5 w-5" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            {isUploading ? (
              <span>{uploadProgress || 'Sedang mengunggah...'}</span>
            ) : (
              <>
                <span className="text-primary hover:underline">
                  Klik untuk memilih berkas
                </span>{' '}
                atau seret berkas ke sini
              </>
            )}
          </p>

          <p className="text-[11px] text-muted-foreground">
            Format yang didukung: PDF, JPG, PNG, WebP • Batas ketat maksimum{' '}
            <span className="font-semibold text-foreground">
              {MAX_TASK_ATTACHMENT_SIZE_LABEL}
            </span>
          </p>
        </div>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {attachments.map((item) => {
            const isDeleting = deletingId === item.id;
            const isDownloading = downloadingId === item.id;
            const canDelete =
              isLeader || (currentUserId && item.uploaded_by === currentUserId);

            return (
              <div
                key={item.id}
                className="group relative flex items-start justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-2xs hover:shadow-xs transition-all hover:border-border"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-lg border bg-muted/40 p-2 shrink-0">
                    {getFileIcon(item.file_type, item.file_name)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <p
                      className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[220px]"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>
                        {item.file_size
                          ? formatAttachmentFileSize(item.file_size)
                          : 'Ukuran t/a'}
                      </span>
                      <span>•</span>
                      <span>{formatUploadDate(item.created_at)}</span>
                    </div>

                    {item.uploader && (
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-muted-foreground">
                        {item.uploader.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.uploader.avatar_url}
                            alt={item.uploader.full_name}
                            className="h-3.5 w-3.5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/10 text-primary text-[8px] font-bold">
                            {getInitials(item.uploader.full_name)}
                          </div>
                        )}
                        <span className="truncate max-w-[120px]">
                          {item.uploader.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    disabled={isDownloading}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
                    title="Buka / Unduh berkas"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={isDeleting}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/20 bg-background text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                      title="Hapus lampiran"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3.5 text-xs text-muted-foreground bg-muted/15">
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          <p>
            Belum ada lampiran pada task ini. Unggah berkas dokumen atau gambar
            untuk melengkapi rincian tugas.
          </p>
        </div>
      )}
    </div>
  );
}
