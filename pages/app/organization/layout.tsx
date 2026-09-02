import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { CrownPagesPublicShell } from '@/components/crownpages-public-shell';
import { createClient } from '@/lib/supabase/server';

export default async function OrganizationLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/organization/login');
  }

  // Check if user owns any organizations
  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('is_active', true);

  if (!ownedOrgs || ownedOrgs.length === 0) {
    redirect('/auth/organization/login');
  }

  return (
    <CrownPagesPublicShell showAccountActions={false}>
      <div className="crownpages-plans-region flex flex-1 flex-col">
        {children}
      </div>
    </CrownPagesPublicShell>
  );
}
