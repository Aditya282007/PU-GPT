import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Flag, AlertCircle, Copy, Check, FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { MessageRenderer } from '@/components/ui/MessageRenderer';

const EXAMPLE_PROMPTS = {
  'Computer Science': [
    'What is the time complexity of quicksort?',
    'Explain the difference between stack and queue',
    'How does garbage collection work in Java?',
  ],
  'Mathematics': [
    'Prove that the square root of 2 is irrational',
    'What is the fundamental theorem of calculus?',
    'Solve the differential equation dy/dx = y',
  ],
  'Physics': [
    'Derive the equations of motion for constant acceleration',
    'What is the photoelectric effect?',
    'Explain quantum entanglement',
  ],
  'Chemistry': [
    'Balance the chemical equation for combustion of methane',
    'What is Le Chatelier\'s principle?',
    'Explain hybridization in methane',
  ],
  'default': [
    'What are the key concepts in this subject?',
    'Summarize the main topics covered this semester',
    'Give me an example problem from this unit',
  ],
};

export function AskPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [citations, setCitations] = useState([]);
  const [showCitations, setShowCitations] = useState({});
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchSubjects();
  }, [isAuthenticated, navigate]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/chat/history', { params: { limit: 1 } });
      setSubjects(user.subjects || []);
      if (user.subjects?.length > 0 && !subject) {
        setSubject(user.subjects[0]);
      }
    } catch {
      setSubjects(user.subjects || []);
      if (user.subjects?.length > 0 && !subject) {
        setSubject(user.subjects[0]);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAnswer, streaming]);

  const handleSubjectChange = (newSubject) => {
    setSubject(newSubject);
    setMessages([]);
    setConversationId(null);
    setCurrentAnswer('');
    setCitations([]);
  };

  const getExamplePrompts = () => {
    return EXAMPLE_PROMPTS[subject] || EXAMPLE_PROMPTS.default;
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !subject) return;

    // Check for web search command (\ prefix)
    const isWebSearch = question.startsWith('\\');
    const query = isWebSearch ? question.slice(1).trim() : question;
    
    if (!query.trim() || !subject) return;

    setLoading(true);
    setError('');
    setStreaming(true);
    setCurrentAnswer('');

    const userMessage = { role: 'user', content: question, citations: [], timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);

    setQuestion('');

    try {
      const token = localStorage.getItem('token');
      const endpoint = isWebSearch ? '/api/chat/web-search' : '/api/chat/ask';
      const body = { question: query, subject };
      if (conversationId) body.conversationId = conversationId;
      
      const res = await fetch(`/api/chat/${isWebSearch ? 'web-search' : 'ask'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: query, subject, conversationId }),
      });

      // Use tee to clone the stream so we can check first chunk
      const [stream1, stream2] = res.body.tee();
      const reader1 = stream1.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let buffer = '';

      // Read first chunk to determine if JSON or stream
      const { done: firstDone, value: firstValue } = await reader1.read();
      const firstChunk = decoder.decode(firstValue, { stream: true });
      
      // Check if first chunk looks like JSON (escalated response or web search response)
      let isJsonResponse = false;
      try {
        const parsed = JSON.parse(firstChunk.trim());
        if (parsed.escalated) {
          isJsonResponse = true;
          setError(parsed.message || 'Question escalated to teacher');
          setStreaming(false);
          setLoading(false);
          return;
        }
        if (parsed.sources) {
          // Web search JSON response
          isJsonResponse = true;
          // Handle web search JSON response
          setStreaming(false);
          setLoading(false);
          const assistantMessage = { 
            role: 'assistant', 
            content: parsed.answer, 
            citations: [],
            webSources: parsed.sources || [],
            isWebSearch: true,
            timestamp: new Date().toISOString() 
          };
          setMessages(prev => [...prev, assistantMessage]);
          return;
        }
      } catch {
        // Not JSON, treat as stream
      }

      // Now use stream2 for the actual reading
      const reader = stream2.getReader();
      buffer = firstChunk; // Include first chunk in buffer

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullAnswer += parsed.content;
                setCurrentAnswer(fullAnswer);
              }
              if (parsed.citations) {
                setCitations(parsed.citations);
              }
              if (parsed.escalated) {
                setError(parsed.message || 'Question escalated to teacher');
                setStreaming(false);
                setLoading(false);
                return;
              }
              if (parsed.conversationId) {
                setConversationId(parsed.conversationId);
              }
            } catch {
              fullAnswer += data;
              setCurrentAnswer(fullAnswer);
            }
          }
        }
      }

      if (buffer) {
        fullAnswer += buffer;
        setCurrentAnswer(fullAnswer);
      }

      const assistantMessage = { 
        role: 'assistant', 
        content: fullAnswer, 
        citations,
        webSources: [],
        isWebSearch: false,
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStreaming(false);

    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get answer. Please try again.');
      setStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk(e);
    }
  };

  const formatMessage = (content) => {
    return content
      .replace(/\[doc:(\d+)\]/g, (match, index) => {
        const citation = citations[index];
        if (!citation) return match;
        return `<span class="citation-ref" data-citation-index="${index}">[${index + 1}]</span>`;
      })
      .replace(/\n/g, '<br>');
  };

  const emptyState = messages.length === 0 && !streaming && !currentAnswer;
  const isWebSearchMode = question.startsWith('\\');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-medium text-2xl text-chalk mb-1">Ask a Question</h1>
        <p className="text-chalk/60">Get answers grounded in your course material</p>
      </div>

      <div className="mb-6">
        <Select
          label="Subject"
          value={subject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          placeholder="Select a subject"
          options={subjects.map(s => ({ value: s, label: s }))}
          error={!subject && messages.length > 0 ? 'Please select a subject' : undefined}
        />
      </div>

      <div className="space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className="animate-in">
            <div className="flex gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-amber-chalk/20' : 'bg-sage/20'
              }`}>
                {msg.role === 'user' ? (
                  <span className="text-amber-chalk text-sm font-medium">{user?.name?.charAt(0).toUpperCase()}</span>
                ) : (
                  <FileText className="w-4 h-4 text-sage" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                  <span className="text-xs text-chalk/40">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  {msg.isWebSearch && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-sage/20 text-sage rounded-full">
                      Web Search
                    </span>
                  )}
                </div>
                <MessageRenderer 
                  content={msg.content} 
                  citations={msg.citations || []} 
                  webSources={msg.webSources || []}
                  isWebSearch={msg.isWebSearch}
                />
              </div>
            </div>
          </div>
        ))}

        {streaming && (
          <div className="animate-in">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-sage" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">Assistant</span>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-chalk" />
                </div>
                <div className="font-display prose prose-invert max-w-none whitespace-pre-wrap">
                  {currentAnswer}
                  <span className="inline-block w-1 h-6 bg-amber-chalk animate-pulse ml-1" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-rust/10 border border-rust/30 rounded-lg text-rust text-sm" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          {error.includes('instructor') && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/flagged')}>
              View my questions
            </Button>
          )}
        </div>
      )}

      <form onSubmit={handleAsk} className="space-y-4" noValidate>
        {emptyState && (
          <div className="card">
            <p className="text-chalk/60 mb-4">Try asking something like:</p>
            <div className="flex flex-wrap gap-2">
              {getExamplePrompts().map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setQuestion(prompt); textareaRef.current?.focus(); }}
                  className="px-3 py-1.5 text-sm text-chalk/80 bg-rule-line/30 border border-rule-line rounded-lg hover:bg-amber-chalk/10 hover:border-amber-chalk/30 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={emptyState ? 'Ask a question about your course material...' : 'Ask a follow-up... (Type \\ for web search)'}
            className="w-full min-h-[100px] max-h-[300px] px-4 py-3 rounded-xl bg-rule-line/30 border border-rule-line text-chalk placeholder:text-chalk/40 resize-none focus:outline-none focus:border-amber-chalk focus:ring-2 focus:ring-amber-chalk/20 font-body"
            rows={3}
            disabled={loading || streaming}
            aria-label="Your question"
          />
          {question.startsWith('\\') && (
            <span className="absolute top-3 right-10 px-2 py-1 text-xs font-medium bg-sage/20 text-sage rounded-full">
              Web Search Mode
            </span>
          )}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              type="submit"
              loading={loading || streaming}
              disabled={!question.trim() || !subject || loading || streaming}
              size="sm"
            >
              <Send className="w-4 h-4" />
              {streaming ? 'Streaming...' : 'Ask'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-chalk/40 text-center">
          Press Enter to send, Shift+Enter for new line. Type <kbd className="px-1.5 py-0.5 bg-rule-line/50 rounded text-xs font-mono">\\</kbd> for web search.
        </p>
      </form>
    </div>
  );
}