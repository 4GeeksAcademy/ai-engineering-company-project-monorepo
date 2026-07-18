type ContactSectionProps = {
  email: string;
  phoneUs: string;
  phoneEs: string;
};

export function ContactSection({ email, phoneUs, phoneEs }: ContactSectionProps) {
  return (
    <section id="contacto" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Contacto</h2>
        <ul className="mt-5 space-y-2 text-sm text-slate-300 sm:text-base">
          <li>
            Email: <a className="text-cyan-200 hover:text-cyan-100" href={`mailto:${email}`}>{email}</a>
          </li>
          <li>Los Angeles: {phoneUs}</li>
          <li>Zaragoza: {phoneEs}</li>
        </ul>
      </div>
    </section>
  );
}
