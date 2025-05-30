import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Send, TrendingUp, Dumbbell, Target } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { ChatMessage } from '@shared/schema';

// Mock user ID
const MOCK_USER_ID = 1;

export default function AIChatPage() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', MOCK_USER_ID],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        userId: MOCK_USER_ID,
        role: 'user',
        content
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', MOCK_USER_ID] });
      setMessage('');
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const quickSuggestions = [
    "How can I improve my form?",
    "What should I eat post-workout?",
    "I'm feeling unmotivated today",
    "Show me my progress"
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Chat Header */}
      <div className="glass-effect px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center">
            <MessageCircle className="text-white" size={20} />
          </div>
          <div>
            <div className="font-medium text-foreground">AI Coach</div>
            <div className="text-xs text-accent">Online</div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-16 w-full max-w-xs rounded-2xl" />
                  <Skeleton className="h-3 w-16 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'justify-end' : ''
            }`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="text-white" size={14} />
                </div>
              )}
              
              <div className={`max-w-xs ${
                msg.role === 'user' 
                  ? 'chat-bubble-user' 
                  : 'chat-bubble-ai'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="text-white" size={24} />
            </div>
            <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
              Chat with AI Coach
            </h3>
            <p className="text-muted-foreground mb-6">
              Get personalized fitness advice, motivation, and answers to your questions.
            </p>
            
            {/* Quick Action Cards */}
            <div className="space-y-3 max-w-sm mx-auto">
              <Card className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
                      <TrendingUp className="text-white" size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">Progress Analysis</div>
                      <div className="text-sm text-muted-foreground">View your fitness improvements</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-secondary to-accent rounded-xl flex items-center justify-center">
                      <Dumbbell className="text-white" size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">Form Check</div>
                      <div className="text-sm text-muted-foreground">Get exercise technique tips</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center">
                      <Target className="text-white" size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">Goal Setting</div>
                      <div className="text-sm text-muted-foreground">Set and track fitness goals</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="text-white" size={14} />
            </div>
            <div className="chat-bubble-ai">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {(!messages || messages.length === 0) && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="glass-effect border-border/50 text-xs"
                onClick={() => setMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="px-4 pb-4">
        <form onSubmit={handleSendMessage} className="glass-effect rounded-2xl p-4 flex items-center space-x-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your AI coach..."
            className="flex-1 bg-transparent border-none text-foreground placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            size="sm"
            className="w-10 h-10 bg-primary hover:bg-primary/90 rounded-full p-0 touch-target"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
