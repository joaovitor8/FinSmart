"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { askMentor, type MentorMessage } from "@/src/lib/actions/mentor";
import { cn } from "@/src/lib/utils";

const SUGGESTIONS = [
  "Onde estou gastando demais este mês?",
  "Como posso economizar 10% das minhas saídas?",
  "Minhas metas estão no ritmo certo?",
  "Que orçamento faz sentido para alimentação?",
];

export function MentorView() {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mantém o chat rolado para o final
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const newHistory: MentorMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newHistory);
    setInput("");

    startTransition(async () => {
      try {
        const { reply } = await askMentor(messages, trimmed);
        setMessages([...newHistory, { role: "assistant", content: reply }]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao consultar o mentor");
        // Remove a mensagem do usuário para ele poder editar e reenviar
        setMessages(messages);
        setInput(trimmed);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
          <Sparkles className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Mentor IA
          </h2>
          <p className="text-xs text-muted-foreground">
            Consultor financeiro pessoal com base nos seus dados
          </p>
        </div>
      </div>

      {/* Lista de mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-card"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={(s) => send(s)} disabled={pending} />
        ) : (
          <ul className="flex flex-col gap-4 p-4 lg:p-6">
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}
            {pending && <ChatBubble role="assistant" content="" loading />}
          </ul>
        )}
      </div>

      {/* Input */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte sobre seus gastos, metas, orçamento..."
            rows={1}
            disabled={pending}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-32"
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={pending || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-background h-9 w-9 shrink-0"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 px-1">
          Enter envia · Shift+Enter pula linha · O histórico não é salvo entre sessões
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (s: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 mb-3">
        <Sparkles className="h-6 w-6 text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        Como posso te ajudar hoje?
      </h3>
      <p className="text-xs text-muted-foreground mb-5 max-w-sm">
        Eu vejo suas entradas, saídas, orçamentos e metas. Pergunte qualquer coisa sobre o
        seu mês.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            disabled={disabled}
            className="text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors rounded-lg border border-border px-3 py-2.5 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  loading,
}: {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}) {
  const isUser = role === "user";
  return (
    <li className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-sky-500/15" : "bg-emerald-500/15",
        )}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4 text-sky-400" />
        ) : (
          <Bot className="h-4 w-4 text-emerald-400" />
        )}
      </div>
      <div
        className={cn(
          "rounded-xl px-4 py-3 text-sm max-w-[85%] leading-relaxed",
          isUser
            ? "bg-sky-500/10 text-foreground"
            : "bg-secondary/60 text-foreground",
        )}
      >
        {loading ? <TypingDots /> : <MarkdownLite text={content} />}
      </div>
    </li>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
    </div>
  );
}

// Renderização leve de Markdown: parágrafos, listas com "- ", **negrito** e `código`.
function MarkdownLite({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === "list" ? (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {b.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(b.text)}
          </p>
        ),
      )}
    </div>
  );
}

type Block = { type: "para"; text: string } | { type: "list"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let list: string[] | null = null;

  function flushPara() {
    if (buf.length) {
      blocks.push({ type: "para", text: buf.join("\n").trim() });
      buf = [];
    }
  }
  function flushList() {
    if (list && list.length) {
      blocks.push({ type: "list", items: list });
      list = null;
    }
  }

  for (const raw of lines) {
    const m = /^\s*[-*]\s+(.*)$/.exec(raw);
    if (m) {
      flushPara();
      if (!list) list = [];
      list.push(m[1]);
    } else {
      flushList();
      if (raw.trim() === "") {
        flushPara();
      } else {
        buf.push(raw);
      }
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Quebra em **bold** mantendo o texto entre os marcadores
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={key++} className="font-semibold">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}
