import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, CopyCheck, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const vscDarkPlusStyles = vscDarkPlus?.styles || [];
const vscDarkPlusPlain = vscDarkPlus?.plain || {};

const codeTheme = {
  ...vscDarkPlus,
  plain: {
    ...vscDarkPlusPlain,
    backgroundColor: '#1E2B24',
    color: '#EDEDE3',
  },
  styles: [
    ...vscDarkPlusStyles,
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
    <div className="relative group my-4 rounded-lg overflow-hidden bg-code-panel border border-amber-chalk/20 shadow-lg">
      {/* Language label */}
      <div className="absolute top-0 left-0 px-2 py-0.5 text-xs font-mono text-amber-chalk/70 bg-chalkboard/90 border-b border-amber-chalk/20">
        {language !== 'plaintext' ? language : ''}
      </div>
      {/* Copy button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="p-2 rounded bg-chalkboard/80 hover:bg-chalkboard hover:border-amber-chalk/30 border border-rule-line text-chalk/60 hover:text-amber-chalk transition-colors"
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
          padding: '1.25rem 1rem 1rem',
          borderRadius: 0,
          fontSize: '0.9rem',
          lineHeight: '1.6',
        }}
        showLineNumbers={true}
        lineNumberStyle={{
          color: '#7FA88F',
          opacity: 0.4,
          paddingRight: '1rem',
          borderRight: '1px solid #3A4A40',
        }}
        {...props}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function CitationMarker({ index, cite, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  
  // Resolve document ID to human-readable title
  const getDocTitle = (cite) => {
    if (cite.sourceDoc) return cite.sourceDoc;
    if (cite.documentId) return `Document ${cite.documentId.slice(-8)}`;
    return `Source ${index + 1}`;
  };
  
  const docTitle = getDocTitle(cite);
  const pageInfo = cite.page ? `, p.${cite.page}` : '';
  
  if (isMobile) {
    return (
      <span className="relative inline-block">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-amber-chalk bg-amber-chalk/10 border border-amber-chalk/30 rounded hover:bg-amber-chalk/20 transition-colors cursor-pointer"
          aria-expanded={expanded}
          aria-label={`View source ${index + 1}`}
        >
          <span className="font-medium">[{index + 1}]</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-chalkboard border border-amber-chalk/30 rounded-lg shadow-xl p-3 z-20 animate-in">
            <p className="font-medium text-amber-chalk text-xs mb-1">{docTitle}{cite.page ? `, p.${cite.page}` : ''}</p>
            <p className="text-sm text-chalk/80">{cite.excerpt}</p>
            {cite.score && (
              <p className="text-xs text-chalk/50 mt-1">Relevance: {(cite.score * 100).toFixed(0)}%</p>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(cite.excerpt)}
              className="mt-2 p-1 text-chalk/40 hover:text-amber-chalk transition-colors"
              aria-label="Copy citation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </span>
    );
  }
  
  // Desktop: margin note with leader line
  return (
    <span className="relative inline-block">
      <span 
        className="citation-marker inline-block px-1.5 py-0.5 text-xs font-mono text-amber-chalk bg-amber-chalk/10 border border-amber-chalk/30 rounded cursor-help"
        data-citation-index={index}
      >
        [{index + 1}]
      </span>
      {/* Margin note tooltip */}
      <div className="margin-note absolute right-full mr-4 w-64">
        <div className="margin-note-content bg-chalkboard border border-amber-chalk/30 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-amber-chalk text-xs mb-1">{getDocTitle(cite)}{cite.page ? `, p.${cite.page}` : ''}</p>
          <p className="text-sm text-chalk/80">{cite.excerpt}</p>
          {cite.score && (
            <p className="text-xs text-chalk/50 mt-1">Relevance: {(cite.score * 100).toFixed(0)}%</p>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(cite.excerpt)}
            className="mt-2 p-1 text-chalk/40 hover:text-amber-chalk transition-colors"
            aria-label="Copy citation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        {/* Leader line */}
        <div className="leader-line absolute right-full h-0.5 w-4 bg-amber-chalk/40" />
      </div>
    </span>
  );
}

function WebSourceItem({ src, index }) {
  const [expanded, setExpanded] = useState(false);
  
  try {
    const domain = new URL(src.url).hostname.replace('www.', '');
    return (
      <div key={index} className="bg-sage/10 border border-sage/20 rounded-lg p-3 group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sage hover:text-sage/80 transition-colors block mb-1 flex items-center gap-1"
            >
              {src.title}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        </div>
      </div>
    );
  } catch {
    return (
      <div key={index} className="bg-sage/10 border border-sage/20 rounded-lg p-3">
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
    );
  }
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
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="font-body text-chalk/90 relative">
      <ReactMarkdown
        components={customComponents}
      >
        {content}
      </ReactMarkdown>
      
      {(citations.length > 0 || webSources.length > 0) && (
        <div className="mt-6 pt-4 border-t border-rule-line">
          {citations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-display text-sm font-medium text-chalk mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-chalk"></span>
                Sources (Course Material)
              </h4>
              <div className="space-y-2">
                {citations.map((cite, i) => (
                  <CitationMarker key={i} index={i} cite={cite} isMobile={isMobile} />
                ))}
              </div>
            </div>
          )}
          
          {webSources.length > 0 && (
            <div>
              <h4 className="font-display text-sm font-medium text-chalk mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sage"></span>
                Sources (Web)
              </h4>
              <div className="space-y-2">
                {webSources.map((src, i) => (
                  <WebSourceItem key={i} src={src} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}