import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeExternalLinks from "rehype-external-links";
import { cn } from "@/lib/utils";

/**
 * Renders admin-authored markdown content safely. Deliberately never uses
 * `dangerouslySetInnerHTML` — react-markdown parses to React elements
 * directly, so there is no HTML string for a script tag or event handler
 * attribute to hide in. External links get rel="noopener noreferrer".
 */
export function RichText({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary dark:prose-invert",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
