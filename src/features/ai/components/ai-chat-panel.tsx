'use client';

import * as React from 'react';
import {
  Send,
  Trash2,
  X,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from 'cn';
import { sendAiChatMessageAction } from '../actions/ai.actions';
import { ChatMessageBubble } from './chat-message-bubble';
import { ChatTypingIndicator } from './chat-typing-indicator';
import {
  type ChatMessage,
  type ChatStatus,
  QUICK_PROMPT_SUGGESTIONS,
  createWelcomeMessage,
} from '../types/ai.types';

interface AiChatPanelProps {
  onClose: () => void;
  userName?: string;
  userRole?: string;
  teamName?: string;
  userAvatarUrl?: string | null;
  className?: string;
}

/**
 * Interactive Chatbot Panel for engineering managers and team leads (Issue #44).
 * Manages local state conversation dialog, quick prompt chips, auto-scrolling,
 * and calls sendAiChatMessageAction with cache-first optimizations.
 */
export function AiChatPanel({
  onClose,
  userName,
  userRole,
  teamName,
  userAvatarUrl,
  className,
}: AiChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    createWelcomeMessage(userName, userRole),
  ]);
  const [input, setInput] = React.useState('');
  const [status, setStatus] = React.useState<ChatStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = React.useState<string | null>(
    null
  );

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  // Focus textarea when panel opens
  React.useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSendMessage = React.useCallback(
    async (textToSend?: string) => {
      const prompt = (textToSend ?? input).trim();
      if (!prompt || status === 'loading') return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: prompt,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setStatus('loading');
      setErrorMessage(null);
      setLastFailedPrompt(null);

      try {
        const result = await sendAiChatMessageAction({
          prompt,
          context: {
            userName,
            userRole,
            teamName,
          },
        });

        if (!result.success) {
          const formError =
            result.error?._form?.[0] ||
            result.error?.prompt?.[0] ||
            'Gagal mendapatkan tanggapan dari asisten AI.';
          const lower = formError.toLowerCase();
          let friendlyMessage = formError;
          if (lower.includes('timeout') || lower.includes('aborted')) {
            friendlyMessage =
              'Permintaan ke penyedia AI melebihi batas waktu (timeout). Silakan coba kirim ulang pertanyaan Anda.';
          } else if (
            lower.includes('503') ||
            lower.includes('high demand') ||
            lower.includes('unavailable')
          ) {
            friendlyMessage =
              'Server AI Google sedang mengalami lonjakan beban sesaat (High Demand / 503). Silakan klik "Kirim Ulang" di bawah.';
          }
          setLastFailedPrompt(prompt);
          setErrorMessage(friendlyMessage);
          setStatus('error');
          return;
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.data?.reply || '',
          createdAt: new Date().toISOString(),
          isCached: result.data?.isCached,
          provider: result.data?.provider,
          model: result.data?.model,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStatus('idle');
      } catch (err) {
        console.error('Error invoking chat action:', err);
        const rawMessage =
          err instanceof Error
            ? err.message
            : 'Terjadi gangguan saat menghubungi server AI.';
        const lower = rawMessage.toLowerCase();
        let friendlyMessage = rawMessage;
        if (lower.includes('timeout') || lower.includes('aborted')) {
          friendlyMessage =
            'Permintaan ke penyedia AI melebihi batas waktu (timeout). Silakan coba kirim ulang pertanyaan Anda.';
        } else if (
          lower.includes('503') ||
          lower.includes('high demand') ||
          lower.includes('unavailable')
        ) {
          friendlyMessage =
            'Server AI Google sedang mengalami lonjakan beban sesaat (High Demand / 503). Silakan klik "Kirim Ulang" di bawah.';
        }
        setLastFailedPrompt(prompt);
        setErrorMessage(friendlyMessage);
        setStatus('error');
      }
    },
    [input, status, userName, userRole, teamName]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([createWelcomeMessage(userName, userRole)]);
    setErrorMessage(null);
    setLastFailedPrompt(null);
    setStatus('idle');
    setInput('');
    textareaRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'flex h-[560px] w-[360px] sm:w-[410px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl transition-all',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-foreground">
                Workhub AI
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Online
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">
              Engineering Manager & Data Analyst
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearChat}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Bersihkan riwayat obrolan"
            aria-label="Bersihkan riwayat obrolan"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Tutup jendela chat"
            aria-label="Tutup jendela chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-xs sm:text-sm">
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            userAvatarUrl={userAvatarUrl}
            userName={userName}
          />
        ))}

        {status === 'loading' && <ChatTypingIndicator />}

        {errorMessage && (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex flex-1 flex-col text-left">
                <span className="font-semibold">Gagal Mengirim Pesan</span>
                <span className="text-[11px] leading-relaxed text-destructive/90">
                  {errorMessage}
                </span>
              </div>
            </div>
            {lastFailedPrompt && status !== 'loading' && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => handleSendMessage(lastFailedPrompt)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-2.5 py-1 text-[11px] font-medium text-destructive-foreground hover:bg-destructive/90 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Kirim Ulang</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips (Visible when only welcome message or few messages) */}
      {messages.length <= 2 && status === 'idle' && (
        <div className="border-t border-border/40 bg-muted/20 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground text-left">
            Rekomendasi Pertanyaan Cepat:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPT_SUGGESTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:bg-accent transition-all cursor-pointer shadow-2xs"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form & Action Bar */}
      <div className="border-t bg-card p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex flex-col rounded-xl border border-border/80 bg-background p-2 transition-within:border-primary shadow-2xs"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan analisis sprint, beban kerja, atau prioritas..."
            rows={2}
            className="w-full resize-none bg-transparent text-xs sm:text-sm placeholder:text-muted-foreground/70 focus:outline-hidden leading-relaxed"
            disabled={status === 'loading'}
          />

          <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-1.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
              <span className="hidden sm:inline">Tekan</span>
              <kbd className="rounded border bg-muted px-1 py-0.2 text-[9px] font-mono">
                Enter
              </kbd>
              <span className="hidden sm:inline">kirim</span>
              <span>•</span>
              <span className="hidden sm:inline">Shift+Enter baris baru</span>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || status === 'loading'}
              className={cn(
                'flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs',
                input.trim() && status !== 'loading'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground/60 cursor-not-allowed'
              )}
              aria-label="Kirim pesan"
            >
              <span>Kirim</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
