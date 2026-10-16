import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Pill } from "@/components/vault/Shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BUP — Data room virtuelle sécurisée (Business Up)" },
      { name: "description", content: "BUP (Business Up) : centralisez vos documents confidentiels et partagez-les avec investisseurs, banques, avocats et acquéreurs, en toute traçabilité." },
      { property: "og:title", content: "BUP — Data room virtuelle sécurisée (Business Up)" },
      { property: "og:description", content: "BUP (Business Up) : levées de fonds, due diligence, cessions avec droits d'accès et journal d'audit." },
    ],
  }),
  component: Landing,
});

const USES = [
  ["Levée de fonds", "Les investisseurs examinent l'entreprise avant d'investir."],
  ["Due diligence", "Vérification juridique, financière, commerciale et technique."],
  ["Acquisition / cession", "L'acquéreur analyse la société en toute confidentialité."],
  ["Financement bancaire", "Dossier complet partagé avec votre banque."],
];

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/rooms" });
    });
  }, [navigate]);

  return (
    <Shell right={<><Pill>Accès contrôlé</Pill><Pill tone="primary">Journal d'audit</Pill></>}>
      <div className="glass-panel p-8 md:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line/40 bg-card/70 px-3.5 py-1.5 text-xs text-primary backdrop-blur-md">
              <img
                src="/icone-128.png"
                alt="BUP"
                width={16}
                height={16}
                loading="eager"
                decoding="async"
                className="h-4 w-4 rounded-sm object-contain"
              />
              <span className="font-medium">BUP • Business Up — Data room virtuelle</span>
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Vos documents confidentiels, partagés sous scellé.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Créez une salle par opération, rangez les pièces par dossier, invitez chaque partie avec des droits stricts (lecture seule, téléchargement, filigrane) et suivez chaque consultation en temps réel.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth">Ouvrir mon espace BUP</Link>
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Plateforme souveraine &amp; conforme RGPD</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-5">
            <div className="group relative w-full max-w-[340px]">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-brand opacity-25 blur-2xl transition duration-500 group-hover:opacity-50" />
              <div className="relative overflow-hidden rounded-2xl border border-line/40 bg-card/85 p-6 text-center shadow-2xl backdrop-blur-xl">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border border-line/40 bg-background/80 p-3 shadow-inner">
                  <img
                    src="/icone-256.png"
                    alt="Logo BUP"
                    width={112}
                    height={112}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-contain drop-shadow-md transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="mt-4">
                  <div className="text-xl font-bold tracking-tight text-foreground">BUP</div>
                  <div className="text-xs font-semibold text-primary">Business Up</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Data room d'entreprise sécurisée</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                  <div className="glass-inset rounded-lg p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chiffrement</div>
                    <div className="text-xs font-semibold text-foreground">AES-256 bits</div>
                  </div>
                  <div className="glass-inset rounded-lg p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Audit</div>
                    <div className="text-xs font-semibold text-foreground">100% traçable</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-4">
        {USES.map(([t, d]) => (
          <div key={t} className="glass-panel p-6">
            <div className="text-[15px] font-semibold">{t}</div>
            <p className="mt-2 text-[13px] text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
