"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // 👈 Aggiunto per supportare tabelle e tasklist
import { Edit2, Eye, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnnotationsPage() {
  const t = useTranslations("Annotations");

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const res = await fetch("/api/annotations");
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
        }
      } catch (error) {
        console.error("Errore nel caricamento degli appunti:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnotations();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Errore nel salvataggio degli appunti:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-var(--header-height)-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-6 py-6 px-2 sm:px-2 md:px-6 min-h-[calc(100dvh-var(--header-height)-4rem)]">
      
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
              <Eye className="w-4 h-4 mr-2" />
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? t("saving") : t("save")}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            {t("edit")}
          </Button>
        )}
      </div>

      <div className="flex-1 rounded-xl">
        {isEditing ? (
          <textarea
            className="w-full h-full min-h-[500px] p-4 bg-muted/30 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm text-foreground"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("placeholder")}
            disabled={isSaving}
          />
        ) : (
          <div className="prose dark:prose-invert max-w-none p-4 rounded-lg bg-card border shadow-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}