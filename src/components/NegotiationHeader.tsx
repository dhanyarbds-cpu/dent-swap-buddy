import { IndianRupee, Clock } from "lucide-react";

interface PriceEvent {
  sender_id: string;
  price_amount: number | null;
  message_type: string;
  created_at: string;
}

interface NegotiationHeaderProps {
  messages: PriceEvent[];
  userId: string;
  otherUserName: string;
  listingTitle: string;
}

const NegotiationHeader = ({ messages, userId, otherUserName, listingTitle }: NegotiationHeaderProps) => {
  const priceMessages = messages.filter(
    (m) => (m.message_type === "price_offer" || m.message_type === "price_accepted") && m.price_amount
  );

  if (priceMessages.length === 0) return null;

  const lastOffer = priceMessages[priceMessages.length - 1];
  const accepted = priceMessages.find((m) => m.message_type === "price_accepted");
  const isMyOffer = lastOffer.sender_id === userId;

  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

  return (
    <div className="border-b border-border bg-card/80 px-4 py-2.5">
      {accepted ? (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-verified/10">
            <span className="text-sm">✅</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-verified">
              Agreed Price: ₹{accepted.price_amount?.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-muted-foreground">You can now proceed to order</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <IndianRupee className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              Last Offer: ₹{lastOffer.price_amount?.toLocaleString("en-IN")}{" "}
              <span className="font-normal text-muted-foreground">
                by {isMyOffer ? "you" : otherUserName}
              </span>
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatTime(lastOffer.created_at)}</span>
              <span className="mx-1">•</span>
              <span>{priceMessages.length} offer{priceMessages.length > 1 ? "s" : ""} total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NegotiationHeader;
