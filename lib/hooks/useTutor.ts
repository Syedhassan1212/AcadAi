import { useState } from 'react';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseTutorOptions {
  subjectId?: string;
  topicIds?: string[];
  initialHistory?: TutorMessage[];
}

export function useTutor({ subjectId, topicIds = [], initialHistory = [] }: UseTutorOptions = {}) {
  const [history, setHistory] = useState<TutorMessage[]>(initialHistory);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMsg = message.trim();
    const newHistory: TutorMessage[] = [...history, { role: 'user', content: userMsg }];
    
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch('/api/tutor/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/plain'
        },
        body: JSON.stringify({ 
          message: userMsg, 
          history: newHistory,
          subject_id: subjectId,
          topic_ids: topicIds
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      // Add placeholder for assistant response
      setHistory([...newHistory, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        
        setHistory((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          }
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Tutor stream error:', err);
      setHistory((prev) => [
        ...prev, 
        { role: 'assistant', content: 'Neural connection interrupted. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    history,
    setHistory,
    isLoading,
    sendMessage
  };
}
