import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Pill } from "@/components/vault/Shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Business Sacal Room — Data room virtuelle sécurisée" },
      { name: "description", content: "Centralisez vos documents confidentiels et partagez-les avec investisseurs, banques, avocats et acquéreurs, en toute traçabilité." },
      { property: "og:title", content: "Business Sacal Room — Data room virtuelle sécurisée" },
      { property: "og:description", content: "Levées de fonds, due diligence, cessions : une data room avec droits d'accès et journal d'audit." },
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
      <div className="glass-panel p-10 md:p-14">
        <div className="eyebrow mb-3">Data room virtuelle</div>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Vos documents confidentiels, partagés sous scellé.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Créez une salle par opération, rangez les pièces par dossier, invitez chaque partie avec ses droits, et suivez qui consulte quoi.
        </p>
        <Button asChild variant="hero" size="lg" className="mt-8">
          <Link to="/auth">Ouvrir ma data room</Link>
        </Button>
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
