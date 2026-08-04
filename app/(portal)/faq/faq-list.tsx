"use client";

import { useMemo, useState } from "react";
import { ThumbsUp, ThumbsDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { submitFaqFeedback } from "@/actions/faq";
import type { FaqRow } from "@/types/database";

export function FaqList({ faqs, categoryLabelById }: { faqs: FaqRow[]; categoryLabelById: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <div>
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search FAQs…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching FAQs.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>
                <span className="text-left">
                  {faq.question}
                  {faq.category_id ? <span className="ml-2 text-xs font-normal text-muted-foreground">{categoryLabelById[faq.category_id]}</span> : null}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{faq.answer}</p>
                {!feedbackGiven[faq.id] ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    Was this helpful?
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={async () => {
                        await submitFaqFeedback(faq.id, true);
                        setFeedbackGiven((prev) => ({ ...prev, [faq.id]: true }));
                      }}
                    >
                      <ThumbsUp className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={async () => {
                        await submitFaqFeedback(faq.id, false);
                        setFeedbackGiven((prev) => ({ ...prev, [faq.id]: true }));
                      }}
                    >
                      <ThumbsDown className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Thanks for your feedback!</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
