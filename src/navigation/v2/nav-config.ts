import { navConfig, type NavGroup, type NavItem, type NavChild, type NavSubGroup } from "@/components/layout/nav-config";
import { buildCoordinatorLfNavConfig } from "@/components/layout/coordinator-lf-nav-config";
import { toV2Path } from "@/lib/v2/route-map";

function mapChild(child: NavChild): NavChild {
  return { ...child, url: toV2Path(child.url) };
}

function mapChildren(children: NavItem["children"]): NavItem["children"] {
  if (!children) return undefined;
  if (children.length === 0) return children;

  const first = children[0];
  if (first && "subgroup" in first) {
    return (children as NavSubGroup[]).map((group) => ({
      ...group,
      items: group.items.map(mapChild),
    }));
  }

  return (children as NavChild[]).map(mapChild);
}

function mapNavItem(item: NavItem): NavItem {
  return {
    ...item,
    url: toV2Path(item.url),
    children: mapChildren(item.children),
  };
}

function mapNavGroups(groups: NavGroup[]): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map(mapNavItem),
  }));
}

export function buildV2NavConfig(): NavGroup[] {
  return mapNavGroups(navConfig);
}

export function buildV2CoordinatorLfNavConfig(): NavGroup[] {
  return mapNavGroups(buildCoordinatorLfNavConfig());
}
