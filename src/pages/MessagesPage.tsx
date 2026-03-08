import { MessageSquare, Search } from "lucide-react";

const chats = [
  { id: "1", name: "Priya Sharma", lastMessage: "Is the instrument kit still available?", time: "2h ago", unread: 2, verified: true },
  { id: "2", name: "Arjun Mehta", lastMessage: "Can you do ₹300 for the book?", time: "5h ago", unread: 0, verified: true },
  { id: "3", name: "Kavya Reddy", lastMessage: "I'll pick it up tomorrow", time: "1d ago", unread: 0, verified: false },
];

const MessagesPage = () => (
  <div className="safe-bottom min-h-screen bg-background">
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Messages</h1>
        <button className="rounded-full p-2 text-muted-foreground hover:bg-muted">
          <Search className="h-5 w-5" />
        </button>
      </div>
    </header>

    <main className="mx-auto max-w-lg">
      {chats.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 font-semibold text-foreground">No messages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start browsing and send a buy request!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {chats.map((chat) => {
            const initials = chat.name.split(" ").map((n) => n[0]).join("");
            return (
              <button key={chat.id} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {initials}
                  {chat.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-verified text-[8px] font-bold text-verified-foreground flex items-center justify-center">✓</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{chat.name}</span>
                    <span className="text-[11px] text-muted-foreground">{chat.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {chat.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </main>
  </div>
);

export default MessagesPage;
