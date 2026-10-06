'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Link as LinkIcon,
  Quote,
} from 'lucide-react';

interface MarkdownTaskEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minRows?: number;
  placeholder?: string;
}

export function MarkdownTaskEditor({
  value,
  onChange,
  disabled = false,
  minRows = 8,
  placeholder = 'Type your description here...',
}: MarkdownTaskEditorProps) {
  const [activeTab, setActiveTab] = React.useState<'write' | 'preview'>(
    'write'
  );
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (
    prefix: string,
    suffix: string = '',
    defaultText: string = ''
  ) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selection}${suffix}`;
    const nextValue =
      value.substring(0, start) + replacement + value.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length
      );
    }, 0);
  };

  return (
    <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
      {/* GitHub Header: Tabs (Write / Preview) & Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b bg-muted/40 px-3 py-1.5 gap-2">
        {/* Write & Preview Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'write'
                ? 'bg-background text-foreground shadow-2xs border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-background text-foreground shadow-2xs border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Markdown Toolbar (Only visible in Write mode) */}
        {activeTab === 'write' && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <button
              type="button"
              onClick={() => insertFormatting('### ', '', 'Heading')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add heading"
            >
              <Heading className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'bold text')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add bold text"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'italic text')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add italic text"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ', '', 'quote')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add quote"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`', 'code')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Insert code"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('[', '](url)', 'link text')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add a link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-3.5 w-[1px] bg-border" />

            <button
              type="button"
              onClick={() => insertFormatting('- ', '', 'List item')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add a bulleted list"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('1. ', '', 'Numbered item')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add a numbered list"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- [ ] ', '', 'Task list item')}
              disabled={disabled}
              className="rounded p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Add a task list"
            >
              <ListTodo className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="p-3">
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={minRows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full resize-y rounded-lg border bg-background p-3 text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          />
        ) : (
          <div className="min-h-[160px] rounded-lg border bg-background/50 p-4 markdown-body text-foreground leading-relaxed selection:bg-primary/20 text-sm">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Nothing to preview.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
