/**
 * "My Workload" — temporarily closed for the finals presentation.
 *
 * Only the "Currently Developing" status placeholder renders. The /workload
 * route and sidebar entry remain active while the workload module is rebuilt.
 */
export function WorkloadPage(): JSX.Element {
  return (
    <section aria-labelledby="workload-status-title" className="mx-auto max-w-2xl">
      <div role="status" className="glass-card border-dashed px-6 py-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Currently Developing
          </span>
        </span>
        <h2
          id="workload-status-title"
          className="mt-5 text-lg font-semibold text-slate-900"
        >
          My Workload is under development
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          This module is still being developed and will be released in a future
          update.
        </p>
      </div>
    </section>
  );
}

