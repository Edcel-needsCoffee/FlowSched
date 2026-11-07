import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useTermStore } from '../store/term.store';

/** Reads the existing server engine; no client-side duplicate calculation. */
export function TeachingLoadPage(): JSX.Element {
  const facultyId = useAuthStore((s) => s.user?.facultyId);
  const termId = useTermStore((s) => s.selectedTermId);
  const [load, setLoad] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    if (facultyId && termId) void apiFetch<{load:Record<string,unknown>}>(`/api/faculty/${facultyId}/teaching-load?termId=${termId}`)
      .then((res) => { if(current) setLoad(res.load); }).catch(() => { if(current) setError('Could not load teaching load.'); });
    return () => {current=false;};
  },[facultyId,termId]);
  return <section className="rounded-2xl border border-leaf-100 bg-white p-6 text-ink">
    <h1 className="text-xl font-semibold">Teaching Load</h1>
    {error ? <p role="alert">{error}</p> : !facultyId || !termId ? <p>Select a faculty member and academic term.</p> : !load ? <p role="status">Loading teaching load…</p> :
      <dl className="grid grid-cols-2 gap-4">{['lecture_hours','lab_hours','teaching_hours','preps','prep_ceiling','total_faculty_time'].map((key)=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(load[key])}</dd></div>)}</dl>}
  </section>;
}
