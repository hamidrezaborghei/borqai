import React, { Suspense, useState, useEffect } from "react";
import Markdown, {
  Components as ReactMarkdownComponents,
} from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/features/chat/copy-button";

interface MarkdownRendererProps {
  children: string;
}

// Function to detect RTL text
function isRTLText(text: string): boolean {
  // RTL Unicode ranges for Arabic, Hebrew, Persian, Urdu, etc.
  const rtlRegex =
    /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  // Check if the text starts with RTL characters
  const trimmedText = text.trim();
  if (trimmedText.length === 0) return false;

  // Check the first few characters to determine direction
  const firstChars = trimmedText.substring(0, 10);
  return rtlRegex.test(firstChars);
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="space-y-3">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={COMPONENTS(isRTLText(children))}
      >
        {children}
      </Markdown>
    </div>
  );
}

interface Token {
  content: string;
  htmlStyle?: string | Record<string, string>;
}

interface HighlightedPreProps extends React.HTMLAttributes<HTMLPreElement> {
  children: string;
  language: string;
}

const HighlightedPre = React.memo(
  ({ children, language, ...props }: HighlightedPreProps) => {
    const [tokens, setTokens] = useState<Token[][]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const highlightCode = async () => {
        try {
          const { codeToTokens, bundledLanguages } = await import("shiki");

          if (!(language in bundledLanguages)) {
            setTokens([]);
            setIsLoading(false);
            return;
          }

          const result = await codeToTokens(children, {
            lang: language as keyof typeof bundledLanguages,
            defaultColor: false,
            themes: {
              light: "github-light",
              dark: "github-dark",
            },
          });

          setTokens(result.tokens);
        } catch (error) {
          console.error("Error highlighting code:", error);
          setTokens([]);
        } finally {
          setIsLoading(false);
        }
      };

      highlightCode();
    }, [children, language]);

    if (isLoading || tokens.length === 0) {
      return <pre {...props}>{children}</pre>;
    }

    return (
      <pre {...props}>
        <code>
          {tokens.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              <span>
                {line.map((token: Token, tokenIndex: number) => {
                  const style =
                    typeof token.htmlStyle === "string"
                      ? undefined
                      : token.htmlStyle;

                  return (
                    <span
                      key={tokenIndex}
                      className="text-shiki-light bg-shiki-light-bg dark:text-shiki-dark dark:bg-shiki-dark-bg"
                      style={style}
                    >
                      {token.content}
                    </span>
                  );
                })}
              </span>
              {lineIndex !== tokens.length - 1 && "\n"}
            </React.Fragment>
          ))}
        </code>
      </pre>
    );
  }
);
HighlightedPre.displayName = "HighlightedCode";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  className?: string;
  language: string;
}

const CodeBlock = ({
  children,
  className,
  language,
  ...restProps
}: CodeBlockProps) => {
  const code =
    typeof children === "string"
      ? children
      : childrenTakeAllStringContents(children);

  const preClass = cn(
    "overflow-x-scroll rounded-md border bg-background/50 p-4 font-mono text-sm [scrollbar-width:none]",
    className
  );

  return (
    <div className="group/code relative mb-4">
      <Suspense
        fallback={
          <pre className={preClass} {...restProps}>
            {children}
          </pre>
        }
      >
        <HighlightedPre language={language} className={preClass}>
          {code}
        </HighlightedPre>
      </Suspense>

      <div className="invisible absolute right-2 top-2 flex space-x-1 rounded-lg p-1 opacity-0 transition-all duration-200 group-hover/code:visible group-hover/code:opacity-100">
        <CopyButton content={code} copyMessage="Copied code to clipboard" />
      </div>
    </div>
  );
};

function childrenTakeAllStringContents(element: unknown): string {
  if (typeof element === "string") {
    return element;
  }

  if (element && typeof element === "object" && "props" in element) {
    const elementWithProps = element as { props?: { children?: unknown } };
    if (elementWithProps.props?.children) {
      const children = elementWithProps.props.children;

      if (Array.isArray(children)) {
        return children
          .map((child) => childrenTakeAllStringContents(child))
          .join("");
      } else {
        return childrenTakeAllStringContents(children);
      }
    }
  }

  return "";
}

const COMPONENTS = (rtl: boolean): ReactMarkdownComponents => ({
  h1: withClass("h1", "text-2xl font-semibold"),
  h2: withClass("h2", "font-semibold text-xl"),
  h3: withClass("h3", "font-semibold text-lg"),
  h4: withClass("h4", "font-semibold text-base"),
  h5: withClass("h5", "font-medium"),
  strong: withClass("strong", "font-semibold"),
  a: withClass("a", "text-primary underline underline-offset-2"),
  blockquote: withClass("blockquote", "border-l-2 border-primary pl-4"),
  code: ((props) => {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <CodeBlock className={className} language={match[1]} {...rest}>
        {children}
      </CodeBlock>
    ) : (
      <code
        className={cn(
          "font-mono [:not(pre)>&]:rounded-md [:not(pre)>&]:bg-background/50 [:not(pre)>&]:px-1 [:not(pre)>&]:py-0.5"
        )}
        {...rest}
      >
        {children}
      </code>
    );
  }) as ReactMarkdownComponents["code"],
  pre: ((props) => props.children) as ReactMarkdownComponents["pre"],
  ol: withClass(
    "ol",
    !rtl ? "list-decimal space-y-2 pl-6" : "list-decimal space-y-2 pr-6"
  ),
  ul: withClass(
    "ul",
    !rtl ? "list-disc space-y-2 pl-6" : "list-disc space-y-2 pr-6"
  ),
  li: withClass("li", "my-1.5"),
  table: withClass(
    "table",
    "w-full border-collapse overflow-y-auto rounded-md border border-foreground/20"
  ),
  th: withClass(
    "th",
    "border border-foreground/20 px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  td: withClass(
    "td",
    "border border-foreground/20 px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  tr: withClass("tr", "m-0 border-t p-0 even:bg-muted"),
  p: withClass("p", "whitespace-pre-wrap"),
  hr: withClass("hr", "border-foreground/20"),
});

function withClass<T extends keyof HTMLElementTagNameMap>(
  Tag: T,
  classes: string
) {
  const Component = (props: React.HTMLAttributes<HTMLElement>) =>
    React.createElement(Tag, { className: classes, ...props });
  Component.displayName = Tag as string;
  return Component;
}

export default MarkdownRenderer;
