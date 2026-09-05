import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  "Inbox WhatsApp com filas e agentes",
  "Vários números no mesmo painel",
  "Contatos e histórico no PostgreSQL",
  "Relatórios de tickets e mensagens",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute top-4 right-4 z-20 lg:right-8 lg:top-6">
        <ThemeToggle />
      </div>
      <section className="relative hidden overflow-hidden bg-[#070b14] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-24 size-[420px] rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 size-[320px] rounded-full bg-sky-500/10 blur-3xl" />
        <BrandLogo
          force="dark"
          className="relative z-10 h-32 w-[28rem] xl:h-36 xl:w-[32rem]"
          priority
        />
        <div className="relative z-10 max-w-lg space-y-6 text-white">
          <p className="text-xs font-medium tracking-[0.28em] text-sky-300 uppercase">
            Adel Tech
          </p>
          <h2 className="font-heading text-4xl leading-tight tracking-tight xl:text-5xl">
            Multiatendimento WhatsApp para a operação.
          </h2>
          <p className="max-w-md text-sm leading-6 text-white/65">
            Conecte números, distribua filas e atenda no mesmo lugar — com o
            molde Adel.
          </p>
          <ul className="grid gap-3 pt-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <span className="size-1.5 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs tracking-wide text-white/40">
          Conexões → Filas → Atendimento → Relatórios
        </p>
      </section>
      <section className="flex items-center justify-center bg-background px-6 py-16 sm:px-10">
        {children}
      </section>
    </div>
  );
}
