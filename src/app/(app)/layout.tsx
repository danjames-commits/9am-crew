import { Nav } from '@/components/Nav';
import { requireMember } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return (
    <>
      {children}
      <Nav />
    </>
  );
}
