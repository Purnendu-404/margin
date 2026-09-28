import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const PLAIN = ["text", "ascii", "plaintext", "txt"];

export default function Markdown({ children }) {
  return (
    <div className="note">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code({ className, children, ...props }) {
            const raw = String(children);
            const lang = /language-(\w+)/.exec(className || "")?.[1];
            if (!lang && !raw.includes("\n")) return <code {...props}>{children}</code>;
            const body = raw.replace(/\n$/, "");
            // diagrams and untagged blocks: plain monospace, no colours, exact spacing
            if (!lang || PLAIN.includes(lang)) return <pre className="diagram">{body}</pre>;
            return (
              <SyntaxHighlighter style={oneDark} language={lang} PreTag="div"
                customStyle={{ borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                {body}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}