import { CandidateForm } from '../../components/candidates/CandidateForm';

export default function NewCandidatePage() {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Nueva candidatura</h2>
        <p className="mt-1 text-sm text-slate-600">Completa todos los campos para dar de alta al candidato.</p>
      </header>

      <CandidateForm mode="create" />
    </section>
  );
}
