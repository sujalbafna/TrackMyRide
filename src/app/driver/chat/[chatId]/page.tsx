
'use client';

import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, doc, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard-header';
import { Input } from '@/components/ui/input';
import { SidebarInset } from '@/components/ui/sidebar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Chat, ChatMessage, UserProfile, WithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const chatId = params.chatId as string;
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messageText, setMessageText] = useState('');

  const chatRef = useMemoFirebase(() => (firestore && chatId ? doc(firestore, 'chats', chatId) : null), [firestore, chatId]);
  const { data: chat, isLoading: chatLoading } = useDoc<Chat>(chatRef);

  const messagesRef = useMemoFirebase(() => (firestore && chatId ? query(collection(firestore, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc')) : null), [firestore, chatId]);
  const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesRef);

  const otherParticipantId = useMemo(() => {
    if (!chat || !user) return null;
    return chat.participantIds.find(id => id !== user.uid);
  }, [chat, user]);

  const { data: otherUser, isLoading: otherUserLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (firestore && otherParticipantId ? doc(firestore, 'users', otherParticipantId) : null), [firestore, otherParticipantId])
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !firestore || !chatId) return;

    try {
      await addDoc(collection(firestore, 'chats', chatId, 'messages'), {
        chatId: chatId,
        senderId: user.uid,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
      });
      setMessageText('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const isLoading = isUserLoading || chatLoading || messagesLoading || otherUserLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!chat) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Chat not found.</p>
        </div>
    )
  }

  return (
    <SidebarInset>
      <main className="flex flex-col h-screen">
        <div className="p-4 md:p-6 lg:p-8 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeft className="mr-2" /> Back to Driver List
            </Button>
            <DashboardHeader
              title={`Chat with ${otherUser?.firstName || 'Driver'}`}
              description="Send and receive messages in real-time."
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto bg-muted/50 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {messages?.map(message => {
                    const isSender = message.senderId === user?.uid;
                    const senderProfile = isSender ? null : otherUser;

                    return (
                        <div key={message.id} className={cn("flex items-end gap-3", isSender && "justify-end")}>
                            <div className={cn("flex flex-col gap-1", isSender ? "items-end" : "items-start")}>
                                {!isSender && (
                                    <span className="text-xs text-muted-foreground px-1">
                                        {senderProfile?.firstName}
                                    </span>
                                )}
                                <div className={cn("max-w-md p-3 rounded-lg", isSender ? "bg-primary text-primary-foreground" : "bg-background border")}>
                                    <p>{message.text}</p>
                                    {message.timestamp && (
                                        <p className={cn("text-xs mt-1", isSender ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                            {format(message.timestamp.toDate(), 'p')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                 <div ref={messagesEndRef} />
            </div>
        </div>
        
        <div className="p-4 md:p-6 lg:p-8 flex-shrink-0 bg-background border-t">
          <div className="max-w-4xl mx-auto">
             <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                autoComplete="off"
              />
              <Button type="submit" disabled={!messageText.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
