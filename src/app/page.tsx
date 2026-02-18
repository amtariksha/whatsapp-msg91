"use client";

import { useNumbers } from "@/lib/hooks";
import { ChatList } from "@/components/inbox/chat-list";
import { ChatWindow } from "@/components/inbox/chat-window";
import { ContactDetails } from "@/components/inbox/contact-details";

export default function InboxPage() {
  // Initialize numbers on app load
  useNumbers();

  return (
    <div className="flex h-full overflow-hidden">
      <ChatList />
      <ChatWindow />
      <ContactDetails />
    </div>
  );
}
