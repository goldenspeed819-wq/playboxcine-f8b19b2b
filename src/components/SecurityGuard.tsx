import { useSecurityProtection } from '@/hooks/useSecurityProtection';

export function SecurityGuard() {
  useSecurityProtection();
  return null;
}
