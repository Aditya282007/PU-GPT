import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, CopyCheck } from 'lucide-react';
import { useState } from 'react';

const codeTheme = {
  ...vscDarkPlus,
  plain: {
    ...vscDarkPlus.plain,
    backgroundColor: '#1E2B24',
    color: '#EDEDE3',
  },
  styles: [
    ...vscDarkPlus.styles,
    { types: ['keyword', 'operator'], style: { color: '#E8B84B', fontWeight: 'bold' } },
    { types: ['string', 'regex'], style: { color: '#7FA88F' } },
    { types: ['number', 'constant'], style: { color: '#E8B84B' } },
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#7FA88F', fontStyle: 'italic' } },
    { types: ['punctuation', 'operator'], style: { color: '#E8B84B' } },
    { types: ['namespace'], style: { color: '#E8B84B' } },
  ],
};

function CodeBlock({ children, className, ...props }) {
  const [copied, setCopied] = useState(false);
  const language = className ? className.replace(/language-/, '') : 'plaintext';
  
  return (
    <div className="relative group my-3 rounded-lg overflow-hidden bg-chalkboard border border-rule-line">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="p-1.5 rounded bg-rule-line/50 hover:bg-rule-line/70 text-chalk/60 hover:text-amber-chalk transition-colors"
          aria-label="Copy code"
        >
          {copied ? <CopyCheck className="w-4 h-4 text-sage" /> : <Copy className="w-4 h-4 text-chalk/60" />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={codeTheme}
        customStyle={{
          margin: 0,
          padding: '1rem',
          borderRadius: 0,
        }}
        showLineNumbers={true}
        lineNumberStyle={{
          color: '#7FA88F',
          opacity: 0.5,
        }}
        {...props}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

const customComponents = {
  code: ({ children, className, ...props }) => {
    const language = className ? className.replace(/language-/, '') : 'plaintext';
    return <CodeBlock language={language} {...props}>{children}</CodeBlock>;
  },
  pre: ({ children, ...props }) => {
    return <pre {...props}>{children}</pre>;
  },
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-amber-chalk underline hover:text-amber-chalk/80 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-amber-chalk/50 pl-4 italic text-chalk/80 my-3"
      {...props}
    >
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-6 my-3 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-6 my-3 space-y-1" {...props}>
      {children}
    </ol>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="font-display text-2xl font-medium text-chalk mb-2 mt-4" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="font-display text-xl font-medium text-chalk mb-2 mt-4" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="font-display text-lg font-medium text-chalk mb-2 mt-3" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="my-3 text-chalk/90 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-medium text-chalk" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-chalk/90" {...props}>
      {children}
    </em>
  ),
  hr: ({ ...props }) => (
    <hr className="border-rule-line my-4" {...props} />
  ),
};

export function MessageRenderer({ content, citations = [], webSources = [], isWebSearch = false }) {
  return (
    <div className="font-body text-chalk/90">
      <ReactMarkdown
        components={customComponents}
      >
        {content}
      </ReactMarkdown>
      
      {(citations.length > 0 || webSources.length > 0) && (
        <div className="mt-4 pt-4 border-t border-rule-line">
          {citations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-display text-sm font-medium text-chalk mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-chalk"></span>
                Sources (Course Material)
              </h4>
              <div className="space-y-2">
                {citations.map((cite, i) => (
                  <div key={i} className="bg-rule-line/30 border border-rule-line rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-mono text-xs text-chalk/60 mb-1">
                          Source: Document {cite.documentId?.slice(-8) || 'N/A'} • Chunk {cite.chunkId?.split('-').pop() || 'N/A'}
                        </p>
                        <p className="text-sm text-chalk/80">{cite.excerpt}</p>
                        {cite.score && (
                          <p className="text-xs text-chalk/50 mt-1">Relevance: {(cite.score * 100).toFixed(0)}%</p>
                        )}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(cite.excerpt)}
                        className="p-1 text-chalk/40 hover:text-amber-chalk transition-colors shrink-0"
                        aria-label="Copy citation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {webSources.length > 0 && (
            <div>
              <h4 className="font-display text-sm font-medium text-chalk mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
                Sources (Web)
              </h4>
              <div className="space-y-2">
                {webSources.map((src, i) => (
                  <div key={i} className="bg-sage/10 border border-sage/20 rounded-lg p-3">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sage hover:text-sage/80 transition-colors block mb-1"
                    >
                      {src.title}
                    </a>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-chalk/60 font-mono break-all"
                    >
                      {src.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}