import {
  Building2,
  LayoutDashboard,
  Tent,
  UserPlus,
  Users,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/nav-config";

export function buildCoordinatorLfNavConfig(): NavGroup[] {
  return [
    {
      items: [
        {
          title: "items.dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "items.clubs",
          url: "/dashboard/clubs",
          icon: Building2,
          permission: "clubs:read",
        },
        {
          title: "items.users",
          url: "/dashboard/users",
          icon: Users,
          permission: "users:read",
        },
        {
          title: "items.coordinatorMembership",
          url: "/dashboard/requests/membership",
          icon: UserPlus,
          permission: "club_members:approve",
        },
        {
          title: "items.camporees",
          url: "/dashboard/camporees",
          icon: Tent,
          permission: "camporees:read",
        },
      ],
    },
  ];
}
