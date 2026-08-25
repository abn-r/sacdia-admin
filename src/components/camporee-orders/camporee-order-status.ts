import type { StatusIntent } from "@/components/ui/status-badge";
import type {
  CamporeeOrderDistributionStatus,
  CamporeeOrderStatus,
} from "@/lib/types/camporee-orders";

export const CAMPOREE_ORDER_STATUS_INTENT: Record<
  CamporeeOrderStatus,
  StatusIntent
> = {
  ISSUED: "info",
  PROOF_SUBMITTED: "warning",
  PROOF_REJECTED: "destructive",
  PAID: "success",
  DELIVERED: "success",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export const CAMPOREE_ORDER_DISTRIBUTION_INTENT: Record<
  CamporeeOrderDistributionStatus,
  StatusIntent
> = {
  NOT_STARTED: "neutral",
  PARTIAL: "warning",
  COMPLETE: "success",
};
