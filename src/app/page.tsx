
import { Suspense } from "react";
import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6">Loading chat...</div>}>
      <Chat />
    </Suspense>
  );
}
