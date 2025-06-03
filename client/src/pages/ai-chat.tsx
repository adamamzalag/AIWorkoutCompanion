import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Send, TrendingUp, Dumbbell, Target } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { ChatMessage, User } from '@shared/schema';
import { useAuth } from '@/hooks/useAuth';

export default function AIChatPage() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', (userProfile as any)?.id],
    queryFn: async () => {
      const userId = (userProfile as any)?.id;
      const response = await fetch(`/api/chat?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      return response.json();
    },
    enabled: !!(userProfile as any)?.id,
  });

  console.log('Chat messages data:', { messages, isLoading, userProfileId: (userProfile as any)?.id });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const userId = (userProfile as any)?.id;
      console.log('Sending chat message:', { userId, content, userProfile });
      
      if (!userId) {
        throw new Error('User profile not loaded');
      }
      
      const response = await apiRequest('POST', '/api/chat', {
        userId,
        role: 'user',
        content
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', (userProfile as any)?.id] });
      setMessage('');
      setIsTyping(false);
      // Reset textarea height to default
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
      }
      // Scroll to bottom after new message
      setTimeout(() => scrollToBottom(), 100);
    },
    onError: () => {
      setIsTyping(false);
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Handle send message called:', { 
      message: message.trim(), 
      isPending: sendMessageMutation.isPending,
      userProfile,
      userId: (userProfile as any)?.id 
    });
    
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
      <div className={`flex-1 px-4 py-6 pb-32 ${
        messages && messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden flex items-center justify-center'
      } space-y-6`}>
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
          <div className="text-center px-6">
            {/* Welcome Message */}
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



      {/* Chat Input - Fixed at bottom */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <form onSubmit={handleSendMessage} className="glass-effect rounded-2xl p-3 flex items-end space-x-3 bg-card/80 backdrop-blur-xl border border-border/20">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your AI coach anything..."
            className="flex-1 bg-transparent border-none text-foreground placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-base resize-none min-h-[44px] max-h-[120px] leading-6 py-2.5"
            disabled={sendMessageMutation.isPending}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '44px',
              maxHeight: '120px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <Button
            type="submit"
            size="sm"
            className="w-10 h-10 bg-primary hover:bg-primary/90 rounded-full p-0 touch-target flex items-center justify-center flex-shrink-0"
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
