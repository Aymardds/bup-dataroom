import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Backdrop() {
  return (
    <>
      <div className="pointer-events-none absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-primary/25 blur-[130px] animate-drift" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full bg-iris/20 blur-[140px] animate-drift2" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-accent/20 blur-[150px] animate-drift" />
      <div className="pointer-events-none absolute inset-0 dot-grid" />
    </>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-lg font-semibold text-primary-foreground shadow-brand">
        ◆
      </div>
      <div>
        <div className="text-lg font-semibold tracking-tight">Business Sacal Room</div>
        <div className="eyebrow">Data room virtuelle</div>
      </div>
    </Link>
  );
}

export function Pill({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "primary" }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line/25 bg-card/60 px-4 py-2 text-[12px] text-muted-foreground backdrop-blur-xl">
      <span className={`h-2 w-2 rounded-full ${tone === "accent" ? "bg-accent" : "bg-primary"}`} />
      {children}
    </div>
  );
}

export function SignOutButton() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        await qc.cancelQueries();
        qc.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }}
      className="rounded-full border border-line/25 bg-card/60 px-4 py-2 text-[12px] text-muted-foreground backdrop-blur-xl hover:text-foreground"
    >
      Déconnexion
    </button>
  );
}

export function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />
      <div className="relative mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
          <Logo />
          <div className="flex flex-wrap items-center gap-3">{right}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function initials(s?: string | null) {
  if (!s) return "?";
  const parts = s.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || (s[0] ?? "?").toUpperCase();
}

export const PURPOSES: Record<string, string> = {
  levee_de_fonds: "Levée de fonds",
  due_diligence: "Due diligence",
  cession: "Acquisition / cession",
  financement: "Financement bancaire",
  partenariat: "Partenariat stratégique",
  subvention: "Subvention",
};

export const ROLES: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  editor: "Éditeur",
  viewer: "Lecture seule",
};

export const PARTIES: Record<string, string> = {
  investisseur: "Investisseur",
  banque: "Banque",
  avocat: "Avocat",
  auditeur: "Auditeur",
  acquereur: "Acquéreur",
  partenaire: "Partenaire",
  interne: "Équipe interne",
};
