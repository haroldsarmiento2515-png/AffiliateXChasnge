import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Image as ImageIcon } from "lucide-react";

export default function Messages() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      setIsConnecting(true);
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        setIsConnecting(false);
        wsRef.current = socket;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message') {
            // Invalidate the specific conversation's messages
            if (data.message?.conversationId) {
              queryClient.invalidateQueries({ 
                queryKey: ["/api/messages", data.message.conversationId] 
              });
            }
            // Also invalidate conversations list to update last message preview
            queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
      };

      socket.onclose = () => {
        setIsConnecting(false);
        wsRef.current = null;
      };

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnecting(false);
    }
  }, [isAuthenticated]);

  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  const { data: messages } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedConversation],
    enabled: !!selectedConversation && isAuthenticated,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = () => {
    if (!selectedConversation || !messageText.trim() || !user?.id) return;

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        conversationId: selectedConversation,
        senderId: user.id,
        content: messageText,
      }));
      setMessageText("");
    } else {
      toast({
        title: "Connection Error",
        description: "Real-time messaging is not connected. Trying to reconnect...",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-full">
        {/* Conversations List */}
        <Card className="border-card-border">
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Messages</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              {!conversations || conversations.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conversation: any) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full p-4 text-left hover-elevate ${
                        selectedConversation === conversation.id ? 'bg-accent' : ''
                      }`}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarImage src={conversation.otherUser?.profileImageUrl} />
                          <AvatarFallback>
                            {conversation.otherUser?.firstName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold truncate">
                              {conversation.otherUser?.firstName || 'User'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {conversation.lastMessageAt &&
                                new Date(conversation.lastMessageAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {conversation.offer?.title}
                          </div>
                          {conversation.lastMessage && (
                            <div className="text-sm text-muted-foreground truncate mt-1">
                              {conversation.lastMessage}
                            </div>
                          )}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="border-card-border flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <h3 className="font-semibold">
                  {conversations?.find((c: any) => c.id === selectedConversation)?.otherUser?.firstName || 'Conversation'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {conversations?.find((c: any) => c.id === selectedConversation)?.offer?.title}
                </p>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages?.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderId === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" data-testid="button-attach-image">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!messageText.trim() || isConnecting}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
