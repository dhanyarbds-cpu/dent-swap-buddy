import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (config: any) => any;
        };
      };
    };
  }
}

interface GooglePayButtonProps {
  amount: number;
  onSuccess: (paymentData: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
}

const BASE_REQUEST = {
  apiVersion: 2,
  apiVersionMinor: 0,
};

const ALLOWED_CARD_NETWORKS = ["MASTERCARD", "VISA"];
const ALLOWED_AUTH_METHODS = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

const TOKEN_PARAMS = {
  type: "PAYMENT_GATEWAY",
  parameters: {
    gateway: "razorpay",
    gatewayMerchantId: "3388000000023097338",
  },
};

const BASE_CARD_METHOD = {
  type: "CARD",
  parameters: {
    allowedAuthMethods: ALLOWED_AUTH_METHODS,
    allowedCardNetworks: ALLOWED_CARD_NETWORKS,
  },
};

const CARD_METHOD = {
  ...BASE_CARD_METHOD,
  tokenizationSpecification: TOKEN_PARAMS,
};

// UPI is only supported on Android Google Pay app, not web SDK
// So we only use CARD method for web payments

const GooglePayButton = ({ amount, onSuccess, onError, disabled }: GooglePayButtonProps) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientRef = useRef<any>(null);

  useEffect(() => {
    const init = () => {
      if (!window.google?.payments?.api) {
        // Retry after script loads
        setTimeout(init, 500);
        return;
      }

      const client = new window.google.payments.api.PaymentsClient({
        environment: "PRODUCTION",
      });
      clientRef.current = client;

      client
        .isReadyToPay({
          ...BASE_REQUEST,
          allowedPaymentMethods: [BASE_CARD_METHOD],
        })
        .then((res: any) => {
          if (res.result) {
            setReady(true);
            if (buttonRef.current) {
              const btn = client.createButton({
                onClick: () => handlePay(),
                buttonColor: "black",
                buttonType: "pay",
                buttonSizeMode: "fill",
                buttonLocale: "en",
              });
              buttonRef.current.innerHTML = "";
              buttonRef.current.appendChild(btn);
            }
          }
        })
        .catch((err: any) => {
          console.error("Google Pay readiness check failed:", err);
        });
    };

    init();
  }, []);

  const handlePay = async () => {
    if (!clientRef.current || loading || disabled) return;
    setLoading(true);

    const paymentDataRequest = {
      ...BASE_REQUEST,
      allowedPaymentMethods: [CARD_METHOD],
      transactionInfo: {
        totalPriceStatus: "FINAL",
        totalPrice: amount.toFixed(2),
        currencyCode: "INR",
        countryCode: "IN",
      },
      merchantInfo: {
        merchantName: "DentSwap",
        merchantId: "3388000000023097338",
      },
    };

    try {
      const paymentData = await clientRef.current.loadPaymentData(paymentDataRequest);
      onSuccess(paymentData);
    } catch (err: any) {
      if (err.statusCode === "CANCELED") {
        // User cancelled — not an error
        console.log("Google Pay cancelled by user");
      } else {
        onError(err);
      }
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading Google Pay...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={buttonRef}
        className="gpay-button-container rounded-xl overflow-hidden [&_button]:!rounded-xl [&_button]:!min-h-[48px]"
        style={{ minHeight: 48 }}
      />
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Processing payment...
        </div>
      )}
    </div>
  );
};

export default GooglePayButton;
