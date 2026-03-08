import { Package, Truck, MapPin, CheckCircle, Clock, Circle } from "lucide-react";

interface TrackingStep {
  status: string;
  label: string;
  icon: React.ReactNode;
  timestamp?: string;
}

const TRACKING_STEPS: TrackingStep[] = [
  { status: "pending", label: "Order Placed", icon: <Package className="h-4 w-4" /> },
  { status: "packed", label: "Packed & Ready", icon: <Package className="h-4 w-4" /> },
  { status: "shipped", label: "Shipped", icon: <Truck className="h-4 w-4" /> },
  { status: "in_transit", label: "In Transit", icon: <Truck className="h-4 w-4" /> },
  { status: "out_for_delivery", label: "Out for Delivery", icon: <MapPin className="h-4 w-4" /> },
  { status: "delivered", label: "Delivered", icon: <CheckCircle className="h-4 w-4" /> },
];

const PICKUP_STEPS: TrackingStep[] = [
  { status: "pending", label: "Order Placed", icon: <Package className="h-4 w-4" /> },
  { status: "confirmed", label: "Seller Confirmed", icon: <CheckCircle className="h-4 w-4" /> },
  { status: "ready", label: "Ready for Pickup", icon: <MapPin className="h-4 w-4" /> },
  { status: "delivered", label: "Picked Up", icon: <CheckCircle className="h-4 w-4" /> },
];

interface Props {
  trackingStatus: string;
  deliveryMethod: string;
  estimatedDelivery?: string | null;
  trackingHistory?: Array<{ status: string; timestamp: string; note?: string }>;
  courierName?: string | null;
  trackingNumber?: string | null;
}

const OrderTrackingTimeline = ({ trackingStatus, deliveryMethod, estimatedDelivery, trackingHistory = [], courierName, trackingNumber }: Props) => {
  const steps = deliveryMethod === "shipping" ? TRACKING_STEPS : PICKUP_STEPS;
  const currentIdx = steps.findIndex((s) => s.status === trackingStatus);
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;

  const historyMap = new Map(trackingHistory.map((h) => [h.status, h]));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-primary" />
          Tracking
        </h3>
        {estimatedDelivery && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            ETA: {new Date(estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {courierName && trackingNumber && (
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">{courierName}</span>
          <span className="text-[10px] font-mono text-primary">{trackingNumber}</span>
        </div>
      )}

      <div className="relative pl-6">
        {steps.map((step, i) => {
          const isCompleted = i <= activeIdx;
          const isCurrent = i === activeIdx;
          const history = historyMap.get(step.status);

          return (
            <div key={step.status} className="relative pb-4 last:pb-0">
              {/* Vertical line */}
              {i < steps.length - 1 && (
                <div className={`absolute left-[-16px] top-5 h-full w-0.5 ${i < activeIdx ? "bg-primary" : "bg-border"}`} />
              )}
              {/* Dot */}
              <div className={`absolute left-[-22px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all ${
                isCompleted ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}>
                {isCompleted ? step.icon : <Circle className="h-3 w-3" />}
              </div>
              {/* Label */}
              <div className="ml-1">
                <p className={`text-xs font-semibold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {history?.timestamp && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(history.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {history?.note && (
                  <p className="text-[10px] text-primary">{history.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTrackingTimeline;
