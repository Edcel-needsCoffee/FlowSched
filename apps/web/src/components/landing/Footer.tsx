export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-leaf-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink/55 sm:flex-row sm:items-center sm:px-6">
        <span className="flex items-center gap-2 font-display font-bold text-ink">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-leaf-500" />
          FlowSched
        </span>
        <span className="sm:ml-2">Workload chaos, plotted straight. Built for the IE department.</span>
        <span className="sm:ml-auto">IE Department · Academic scheduling</span>
      </div>
    </footer>
  );
}
