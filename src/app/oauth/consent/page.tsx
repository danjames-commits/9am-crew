import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { ConsentForm } from './ConsentForm';

// Supabase sends the coach here when an app like Grok asks to connect.
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const { authorization_id: id } = await searchParams;
  const { supabase } = await requireMember({ admin: true });

  if (!id) return <Problem text="This link is missing its request. Start the connection again from the app." />;

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) return <Problem text="This request has expired or isn’t valid. Start the connection again from the app." />;
  // Already allowed before: go straight back to the app.
  if (!('authorization_id' in data)) redirect(data.redirect_url);

  return (
    <main className="screen no-nav" style={{ paddingTop: 64 }}>
      <h1>Connect an app</h1>
      <div className="card stack">
        <p>
          <strong>Let {data.client.name} read and change 9am Crew programming as you?</strong>
        </p>
        <p>It will act with your admin access. Only allow this if you just started connecting it from Grok.</p>
        <p className="muted small">Sends you back to: {hostOf(data.redirect_uri)}</p>
      </div>
      <ConsentForm authorizationId={id} />
    </main>
  );
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

function Problem({ text }: { text: string }) {
  return (
    <main className="screen no-nav" style={{ paddingTop: 64 }}>
      <h1>Connect an app</h1>
      <div className="notice bad" role="alert">{text}</div>
    </main>
  );
}
