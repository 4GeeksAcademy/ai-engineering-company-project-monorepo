import { NextResponse } from 'next/server';
import { mockCandidates } from './store';
import { CandidateDetail } from '../../../types/candidate';

export async function GET() {
  return NextResponse.json(mockCandidates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newId = `cand-${Date.now()}`;
    const newCandidate: CandidateDetail = {
      id: newId,
      name: body.name || body.full_name || 'Candidato sin nombre',
      full_name: body.name || body.full_name || 'Candidato sin nombre',
      email: body.email || '',
      phone: body.phone || body.phone_number || '',
      position: body.position || body.job_title || 'Puesto no especificado',
      status: body.status || 'active',
      stage: body.stage || 'applied',
      linkedin: body.linkedin || body.linkedin_url || '',
      cv: body.cv || body.cv_url || '',
      years_of_experience: Number(body.years_of_experience) || 0,
      applied_at: new Date().toISOString(),
      notes: [],
    };

    mockCandidates.unshift(newCandidate);
    return NextResponse.json(newCandidate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de creación.' },
      { status: 400 }
    );
  }
}
