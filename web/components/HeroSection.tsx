import { ReactNode } from 'react';

export default function HeroSection({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#6f8fd6]/80 px-6 py-16 text-center text-white shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.12),transparent_25%)]" />
      <div className="relative mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-white/90 md:text-lg">{subtitle}</p>
        {children ? <div className="pt-3">{children}</div> : null}
      </div>
    </section>
  );
}
