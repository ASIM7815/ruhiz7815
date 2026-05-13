import { toast as showToast } from "@/components/ui/toast";

export function useToast() {
  return {
    toast: showToast,
  };
}
