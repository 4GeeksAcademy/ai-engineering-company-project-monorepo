import { NextResponse } from 'next/server';
import { mockCandidates } from '../../store';
import { Note } from '../../../../../types/candidate';

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

  return NextResponse.json(candidate.notes || []);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const candidate = mockCandidates.find((c) => c.id === id);

  if (!candidate) {
    return NextResponse.json(
      { error: 'Candidato no encontrado.' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    if (!body.content) {
      return NextResponse.json(
        { error: 'El contenido de la nota es requerido.' },
        { status: 400 }
      );
    }

    const newNote: Note = {
      id: `note-${Date.now()}`,
      content: body.content,
      createdAt: new Date().toISOString(),
    };

    if (!candidate.notes) {
      candidate.notes = [];
    }
    candidate.notes.unshift(newNote);

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear la nota.' },
      { status: 400 }
    );
  }
}
