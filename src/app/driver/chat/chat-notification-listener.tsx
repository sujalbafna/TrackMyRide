'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Chat, ChatMessage } from '@/lib/types';
import { usePathname } from 'next/navigation';

export function ChatNotificationListener() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const pathname = usePathname();
  const initialLoadTime = useRef(new Date());

  // Get all chats the current user is a part of, but only if user.uid is available.
  const userChatsQuery = useMemoFirebase(
    () => (user?.uid && firestore ? query(collection(firestore, 'chats'), where('participantIds', 'array-contains', user.uid)) : null),
    [user?.uid, firestore]
  );
  const { data: userChats } = useCollection<Chat>(userChatsQuery);

  // Stabilize the dependency list for the notification listeners.
  // We only want to tear down and rebuild listeners if the set of chat IDs changes.
  const userChatIdsKey = useMemo(() => (userChats?.map(c => c.id).sort().join(',') || ''), [userChats]);

  useEffect(() => {
    if (!userChats || !firestore || !user?.uid) {
      return;
    }

    // Create a listener for each chat.
    const unsubscribes = userChats.map(chat => {
      const messagesQuery = query(
        collection(firestore, 'chats', chat.id, 'messages'),
        where('timestamp', '>', Timestamp.fromDate(initialLoadTime.current))
      );

      const unsubscribe = onSnapshot(messagesQuery, snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const message = change.doc.data() as ChatMessage;

            // Don't notify for user's own messages or if they are already on the chat page.
            const isOnChatPage = pathname.includes(`/driver/chat/${chat.id}`);
            if (message.senderId !== user.uid && !isOnChatPage) {
              toast({
                title: 'New Message Received',
                description: message.text,
              });
            }
          }
        });
      }, (error) => {
          console.error("Chat message listener error:", error);
      });

      return unsubscribe;
    });

    // Cleanup all listeners when the component unmounts or chat list changes identity meaningfully.
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userChatIdsKey, firestore, user?.uid, toast, pathname, userChats]);

  return null; // This component doesn't render anything.
}
