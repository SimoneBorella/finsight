"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Edit2, Eye, Save, Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Definiamo il tipo per la singola nota
type Note = {
  _id?: string;
  content: string;
  order: number;
};

export default function AnnotationsPage() {
  const t = useTranslations("Annotations");

  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const res = await fetch("/api/annotations");
        if (res.ok) {
          const data = await res.json();
          // L'API ora restituisce un array di note ordinate
          setNotes(data.notes || []);
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
      // Normalizziamo l'ordine prima di salvare
      const normalizedNotes = notes.map((note, index) => ({
        ...note,
        order: index,
      }));

      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: normalizedNotes }),
      });

      if (res.ok) {
        setNotes(normalizedNotes);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Errore nel salvataggio degli appunti:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNoteChange = (index: number, newContent: string) => {
    const newNotes = [...notes];
    newNotes[index].content = newContent;
    setNotes(newNotes);
  };

  const handleAddNote = () => {
    setNotes([...notes, { content: "", order: notes.length }]);
  };

  const handleDeleteNote = (index: number) => {
    const newNotes = notes.filter((_, i) => i !== index);
    setNotes(newNotes);
  };

  const moveNote = (index: number, direction: "up" | "down") => {
    const newNotes = [...notes];
    if (direction === "up" && index > 0) {
      [newNotes[index - 1], newNotes[index]] = [newNotes[index], newNotes[index - 1]];
    } else if (direction === "down" && index < newNotes.length - 1) {
      [newNotes[index + 1], newNotes[index]] = [newNotes[index], newNotes[index + 1]];
    }
    setNotes(newNotes);
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

      <div className="flex-1 flex flex-col gap-6">
        {isEditing ? (
          <>
            {notes.map((note, index) => (
              <div key={index} className="flex flex-col gap-2 p-4 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Nota {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => moveNote(index, 'up')} 
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => moveNote(index, 'down')} 
                      disabled={index === notes.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => handleDeleteNote(index)} 
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <textarea
                  className="w-full min-h-[150px] p-4 bg-muted/30 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm text-foreground"
                  value={note.content}
                  onChange={(e) => handleNoteChange(index, e.target.value)}
                  placeholder={t("placeholder")}
                  disabled={isSaving}
                />
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full border-dashed py-8 text-muted-foreground hover:text-foreground" 
              onClick={handleAddNote}
              disabled={isSaving}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi nuova nota
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            {notes.map((note, index) => (
              <div key={index} className="prose dark:prose-invert max-w-none p-6 rounded-xl bg-card border shadow-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content}
                </ReactMarkdown>
              </div>
            ))}
            
            {notes.length === 0 && (
              <div className="text-center p-8 text-muted-foreground border rounded-xl border-dashed">
                Nessuna nota presente. Clicca su Modifica per aggiungerne una.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}