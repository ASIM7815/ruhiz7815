import { Check, CheckCheck, Clock } from "lucide-react";

interface DeliveryStatusProps {
  status: "sending" | "sent" | "delivered" | "read";
  className?: string;
}

export function DeliveryStatus({ status, className = "" }: DeliveryStatusProps) {
  if (status === "sending") {
    return <Clock className={`h-3.5 w-3.5 ${className}`} />;
  }
  
  if (status === "sent") {
    return <Check className={`h-3.5 w-3.5 ${className}`} />;
  }
  
  if (status === "delivered") {
    return <CheckCheck className={`h-3.5 w-3.5 ${className}`} />;
  }
  
  // Read status - blue checkmarks
  return <CheckCheck className={`h-3.5 w-3.5 text-blue-500 ${className}`} />;
}
