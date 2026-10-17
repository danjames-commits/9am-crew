// Shown the moment a tab is tapped, while the page's data loads.
export default function Loading() {
  return (
    <main className="screen" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 36, width: '55%' }} />
      <div className="skeleton" style={{ height: 180 }} />
      <div className="skeleton" style={{ height: 72 }} />
      <div className="skeleton" style={{ height: 72 }} />
    </main>
  );
}
