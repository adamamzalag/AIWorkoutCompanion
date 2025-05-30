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
      {/* Minimal chat indicator - only when there are messages */}
      {messages && messages.length > 0 && (
        <div className="flex items-center justify-center py-2 px-4 border-b border-border/20">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">AI Coach is online</span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 px-4 py-6 pb-32 overflow-y-auto space-y-6">
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
            <div key={msg.id} className={`flex items-start ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                  <MessageCircle className="text-white" size={16} />
                </div>
              )}
              
              <div className={`max-w-[280px] ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-lg px-4 py-3' 
                  : 'glass-effect rounded-2xl rounded-tl-lg px-4 py-3'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-xs mt-2 opacity-70 ${
                  msg.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
              
              {msg.role === 'user' && (
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                  <div className="w-5 h-5 bg-white/20 rounded-full"></div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="text-white" size={32} />
              </div>
              <h2 className="font-poppins font-bold text-2xl text-foreground mb-3">
                Your AI Fitness Coach
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Ready to help you reach your fitness goals with personalized advice and motivation
              </p>
            </div>

            {/* Quick Start Options */}
            <div className="w-full space-y-4 max-w-sm">
              {[
                { icon: TrendingUp, title: "Analyze My Progress", subtitle: "See how you're improving", message: "Can you analyze my workout progress and give me insights?" },
                { icon: Dumbbell, title: "Form & Technique", subtitle: "Get exercise tips", message: "I need help with my exercise form and technique" },
                { icon: Target, title: "Set New Goals", subtitle: "Plan your next milestone", message: "Help me set realistic fitness goals for this month" }
              ].map((option, index) => (
                <Card key={index} className="glass-effect hover:bg-card/60 transition-colors cursor-pointer" onClick={() => setMessage(option.message)}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${
                        index === 0 ? 'from-primary to-secondary' : 
                        index === 1 ? 'from-secondary to-accent' : 
                        'from-accent to-primary'
                      } rounded-xl flex items-center justify-center`}>
                        <option.icon className="text-white" size={18} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-foreground">{option.title}</div>
                        <div className="text-sm text-muted-foreground">{option.subtitle}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start justify-start">
            <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0 mr-3">
              <MessageCircle className="text-white" size={16} />
            </div>
            <div className="glass-effect rounded-2xl rounded-tl-lg px-4 py-3 max-w-[280px]">
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

      {/* Quick Suggestions - Show in main content area when no messages */}
      {(!messages || messages.length === 0) && (
        <div className="px-4 pb-6">
          <div className="text-center mb-4">
            <p className="text-muted-foreground text-sm">Try asking about:</p>
          </div>
          <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
            {quickSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="glass-effect border-border/30 text-left justify-start h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/30"
                onClick={() => setMessage(suggestion)}
              >
                <span className="text-sm text-foreground">{suggestion}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input - Fixed at bottom */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <form onSubmit={handleSendMessage} className="glass-effect rounded-2xl p-3 flex items-center space-x-3 bg-card/80 backdrop-blur-xl border border-border/20">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your AI coach anything..."
            className="flex-1 bg-transparent border-none text-foreground placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            size="sm"
            className="w-10 h-10 bg-primary hover:bg-primary/90 rounded-full p-0 touch-target flex items-center justify-center"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={16} />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
