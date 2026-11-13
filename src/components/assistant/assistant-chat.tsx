"use client";

import { useAssistant } from "@/components/assistant/assistant-context";
import { Bot, Loader2, Send, Sparkles, User, Wrench } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const QUICK_PROMPTS = [
  "Qual é o meu saldo total nas contas?",
  "Como está meu resumo financeiro deste mês?",
  "Quais são os meus cartões de crédito?",
  "Busque meus gastos recentes no mercado",
];

interface AssistantChatProps {
  compact?: boolean;
}

export function AssistantChat({ compact = false }: AssistantChatProps) {
  const { activeConversation, isLoading, sendMessage } = useAssistant();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">Assistente Minhas Finanças</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-6">
              Pergunte sobre saldos, faturas de cartão, competência atual ou busque lançamentos reais do seu banco.
            </p>
            <div className={`grid gap-2 w-full ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 max-w-lg"}`}>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="text-left text-xs p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent/50 hover:border-primary/40 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : msg.isError
                        ? "bg-destructive/10 border border-destructive/40 text-destructive rounded-tl-sm"
                        : "bg-card border border-border/60 text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                      {msg.toolsUsed.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                        >
                          <Wrench className="w-2.5 h-2.5" />
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Consultando seus dados...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border/60 bg-background/80 backdrop-blur-sm flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre suas finanças..."
          disabled={isLoading}
          className="flex-1 bg-muted/50 border border-border/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          aria-label="Enviar mensagem"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
