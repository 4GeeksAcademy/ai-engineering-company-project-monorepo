import React, { useState } from 'react';

interface AddNoteFormProps {
  onAddNote: (content: string) => Promise<void>;
  loading?: boolean;
}

export const AddNoteForm: React.FC<AddNoteFormProps> = ({
  onAddNote,
  loading = false,
}) => {
  const [content, setContent] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setFormError('La nota no puede estar vacía.');
      return;
    }

    setFormError(null);
    try {
      await onAddNote(content.trim());
      setContent('');
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Error al guardar la nota.');
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm mb-6"
    >
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Añadir Nueva Nota
      </h3>

      {formError && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Escribe comentarios, impresiones de entrevista o seguimiento del candidato..."
          disabled={loading}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando nota...
              </>
            ) : (
              'Guardar Nota'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddNoteForm;
