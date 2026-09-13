import { NextResponse } from 'next/server';
import { mockCandidates } from '../store';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const candidate = mockCandidates.find((c) => c.id === id);

  if (!candidate) {
    return NextResponse.json(
      { error: 'Candidato no encontrado.' },
      { status: 404 }
    );
  }

  return NextResponse.json(candidate);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const index = mockCandidates.findIndex((c) => c.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Candidato no encontrado.' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    mockCandidates[index] = {
      ...mockCandidates[index],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(mockCandidates[index]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar candidatura.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  return PATCH(request, { params });
}
