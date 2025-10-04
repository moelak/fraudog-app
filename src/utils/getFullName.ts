import type { OrgEmbed } from "@/hooks/useNotifications";

export const getFullName = (org: OrgEmbed): string => {
  if (!org) return '';
  return Array.isArray(org) ? (org[0]?.full_name ?? '') : (org.full_name ?? '');
};
