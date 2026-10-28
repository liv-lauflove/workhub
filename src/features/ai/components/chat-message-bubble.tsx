'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Zap } from 'lucide-react';
import { cn } from 'cn';
import type { ChatMessage } from '../types/ai.types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  userAvatarUrl?: string | null;
  userName?: string;
  className?: string;
}

/**
 * Message bubble component displaying conversation entries (Issue #44).
 * Supports Markdown rendering for AI responses, copy-to-clipboard,
 * and a visual cache indicator tag when served from PostgreSQL query cache.
 */
export function ChatMessageBubble({
  message,
  userAvatarUrl,
  userName = 'Kamu',
  className,
}: ChatMessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  }, [message.content]);

  const formattedTime = React.useMemo(() => {
    if (!message.createdAt) return '';
    try {
      const date = new Date(message.createdAt);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [message.createdAt]);

  return (
    <div
      className={cn(
        'flex w-full gap-2.5 text-sm',
        isUser ? 'flex-row-reverse items-end' : 'flex-row items-start',
        className
      )}
    >
      {/* Avatar Icon */}
      <div className="flex shrink-0 items-center justify-center">
        {isUser ? (
          userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt={userName}
              className="h-7 w-7 rounded-full border object-cover shadow-2xs"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
              <User className="h-3.5 w-3.5" />
            </div>
          )
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-2xs">
            <Bot className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div
        className={cn(
          'group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm transition-all',
          isUser
            ? 'rounded-br-xs bg-primary text-primary-foreground shadow-xs'
            : 'rounded-tl-xs border border-border/80 bg-card text-card-foreground shadow-2xs'
        )}
      >
        {/* User plain text vs Assistant Markdown */}
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed select-text">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 list-disc pl-4 space-y-0.5 last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 list-decimal pl-4 space-y-0.5 last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                code: ({ children, className: codeClassName }) => {
                  const isBlock = codeClassName?.includes('language-');
                  if (isBlock) {
                    return (
                      <pre className="my-2 overflow-x-auto rounded-lg bg-muted/80 p-2.5 font-mono text-xs">
                        <code>{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto rounded border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-b bg-muted/50 px-2 py-1.5 font-semibold text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-border/60 px-2 py-1.5">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Footer Meta (Timestamp, Cache Badge, Copy Button) */}
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1.5 text-[10px]',
            isUser
              ? 'justify-end text-primary-foreground/75'
              : 'justify-between text-muted-foreground'
          )}
        >
          {/* Assistant-only meta info */}
          {!isUser && (
            <div className="flex items-center gap-1.5">
              {message.isCached && (
                <span
                  className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  title="Jawaban dimuat instan dari cache database untuk menghemat kuota AI"
                >
                  <Zap className="h-2.5 w-2.5" />
                  <span>Dari Cache</span>
                </span>
              )}
              {formattedTime && <span>{formattedTime}</span>}
            </div>
          )}

          {/* User timestamp */}
          {isUser && formattedTime && <span>{formattedTime}</span>}

          {/* Copy Button for Assistant */}
          {!isUser && (
            <button
              type="button"
              onClick={handleCopy}
              className="ml-auto flex items-center gap-1 rounded p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Salin jawaban"
              aria-label="Salin jawaban"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500">Tersalin</span>
                </>
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
