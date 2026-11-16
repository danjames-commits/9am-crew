// The generic loading screen: shown the moment a page is tapped, while its data loads.
// Each page under (app) has a loading.tsx so this shows on every navigation (see route-config.test.ts).
export default function PageSkeleton() {
  return (
    <main className="screen" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 36, width: '55%' }} />
      <div className="skeleton" style={{ height: 180 }} />
      <div className="skeleton" style={{ height: 72 }} />
      <div className="skeleton" style={{ height: 72 }} />
    </main>
  );
}
