import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Pill, SignOutButton, PURPOSES, ROLES, PARTIES, initials } from "@/components/vault/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "overview" | "documents" | "audience" | "journal";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => {
    const t = s["tab"];
    return { tab: ["overview", "documents", "audience", "journal"].includes(t as string) ? (t as Tab) : undefined };
  },
  head: () => ({ meta: [{ title: "Data room — Salle des Coffres" }] }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [party, setParty] = useState("investisseur");
  const [role, setRole] = useState("viewer");
  const [dl, setDl] = useState(false);

  const q = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const [room, roleR, folders, docs, members, logs, canDl] = await Promise.all([
        supabase.from("data_rooms").select("*").eq("id", roomId).single(),
        supabase.rpc("room_role", { _room: roomId }),
        supabase.from("folders").select("*").eq("room_id", roomId).order("position"),
        supabase.from("documents").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
        supabase.from("room_members").select("*").eq("room_id", roomId).order("created_at"),
        supabase.from("activity_logs").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(100),
        supabase.rpc("can_download", { _room: roomId }),
      ]);
      if (room.error) throw room.error;
      return { room: room.data, role: roleR.data as string | null, folders: folders.data ?? [], docs: docs.data ?? [], members: members.data ?? [], logs: logs.data ?? [], canDl: !!canDl.data };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["room", roomId] });
  const log = (action: string, target: string) =>
    supabase.from("activity_logs").insert({ room_id: roomId, user_id: user.id, actor_name: user.email ?? null, action, target });

  if (q.isLoading) return <Shell><div className="text-muted-foreground">Chargement…</div></Shell>;
  if (!q.data) return <Shell><div className="glass-panel p-6">Salle introuvable ou accès refusé.</div></Shell>;
  const d = q.data;
  const isAdmin = d.role === "owner" || d.role === "admin";
  const canEdit = isAdmin || d.role === "editor";
  const folderName = (id: string | null) => d.folders.find((f) => f.id === id)?.name ?? "—";
  const visibleDocs = folder ? d.docs.filter((x) => x.folder_id === folder) : d.docs;
  const views = d.docs.reduce((a, x) => a + x.view_count, 0);

  async function upload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const path = `${roomId}/${crypto.randomUUID()}-${f.name}`;
      const up = await supabase.storage.from("dataroom").upload(path, f);
      if (up.error) { toast.error(up.error.message); continue; }
      await supabase.from("documents").insert({ room_id: roomId, folder_id: folder ?? d.folders[0]?.id ?? null, name: f.name, storage_path: path, size_bytes: f.size, mime_type: f.type || null });
      await log("a déposé", f.name);
    }
    toast.success("Document(s) ajouté(s)");
    refresh();
  }

  async function open(doc: (typeof d.docs)[number], download: boolean) {
    const { data, error } = await supabase.storage.from("dataroom").createSignedUrl(doc.storage_path, 60, download ? { download: doc.name } : undefined);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("record_view", { _doc: doc.id });
    await log(download ? "a téléchargé" : "a consulté", doc.name);
    window.open(data.signedUrl, "_blank");
    refresh();
  }

  async function remove(doc: (typeof d.docs)[number]) {
    await supabase.storage.from("dataroom").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await log("a supprimé", doc.name);
    refresh();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("room_members").insert({ room_id: roomId, email: email.toLowerCase().trim(), organization: org || null, party_type: party, role, can_download: dl });
    if (error) { toast.error(error.message); return; }
    await log("a invité", email);
    toast.success("Invitation enregistrée — la personne doit créer un compte avec cet e-mail.");
    setEmail(""); setOrg("");
    refresh();
  }

  async function revoke(id: string, mail: string) {
    await supabase.from("room_members").delete().eq("id", id);
    await log("a révoqué l'accès de", mail);
    refresh();
  }

  const nav: [Tab, string, string, number | null][] = [
    ["overview", "▦", "Vue d'ensemble", null],
    ["documents", "◈", "Documents", d.docs.length],
    ["audience", "◎", "Audience", d.members.length],
    ["journal", "⤢", "Journal d'audit", null],
  ];

  const DocTable = (
    <div className="glass-inset overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_90px_100px_150px] gap-4 border-b border-line/20 px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Nom</span><span>Dossier</span><span>Vues</span><span>Ajouté</span><span />
      </div>
      {visibleDocs.length === 0 && <div className="px-4 py-6 text-[13px] text-muted-foreground">Aucun document.</div>}
      {visibleDocs.map((doc) => (
        <div key={doc.id} className="grid grid-cols-[1fr_120px_90px_100px_150px] items-center gap-4 border-b border-line/15 px-4 py-3 hover:bg-primary/5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-6 w-8 place-items-center rounded-md bg-primary/15 text-[10px] text-primary">{(doc.name.split(".").pop() ?? "").slice(0, 4).toUpperCase()}</span>
            <span className="truncate text-[13px] font-medium">{doc.name}</span>
          </div>
          <div className="text-[12px] text-muted-foreground">{folderName(doc.folder_id)}</div>
          <div className="text-[12px]">{doc.view_count}</div>
          <div className="text-[12px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</div>
          <div className="flex justify-end gap-2 text-[12px]">
            <button className="text-primary" onClick={() => open(doc, false)}>Ouvrir</button>
            {d.canDl && <button className="text-accent" onClick={() => open(doc, true)}>Télécharger</button>}
            {isAdmin && <button className="text-destructive" onClick={() => remove(doc)}>Suppr.</button>}
          </div>
        </div>
      ))}
    </div>
  );

  const Journal = (n: number) =>
    !isAdmin ? <p className="text-[12px] text-muted-foreground">Réservé aux administrateurs.</p> : (
      <div className="space-y-3">
        {d.logs.slice(0, n).map((l) => (
          <div key={l.id} className="flex items-center gap-3 text-[12px]">
            <span className="w-24 font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="font-medium">{l.actor_name}</span>
            <span className="text-muted-foreground">{l.action} « {l.target} »</span>
          </div>
        ))}
      </div>
    );

  const Members = (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">★</div>
        <div className="flex-1 text-[13px]"><div className="font-medium">Propriétaire</div><div className="text-[11px] text-muted-foreground">Accès complet</div></div>
      </div>
      {d.members.map((m) => (
        <div key={m.id} className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-iris/15 text-[12px] font-semibold text-iris">{initials(m.organization || m.email)}</div>
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="truncate font-medium">{m.organization || m.email}</div>
            <div className="truncate text-[11px] text-muted-foreground">{PARTIES[m.party_type] ?? m.party_type} · {ROLES[m.role]}{m.can_download ? " · téléchargement" : ""} · {m.email}</div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] ${m.status === "active" ? "bg-accent/15 text-accent" : "bg-line/20 text-muted-foreground"}`}>{m.status === "active" ? "Actif" : "Invité"}</span>
          {isAdmin && <button className="text-[11px] text-destructive" onClick={() => revoke(m.id, m.email)}>Révoquer</button>}
        </div>
      ))}
    </div>
  );

  return (
    <Shell right={<><Pill>Accès contrôlé</Pill><Pill tone="primary">{d.docs.length} documents</Pill><SignOutButton /></>}>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="glass-panel h-fit p-5">
          <Link to="/rooms" className="eyebrow mb-3 block hover:text-primary">← Mes data rooms</Link>
          <div className="glass-inset mb-5 p-4">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Dossier</div>
            <div className="mt-1 font-semibold leading-tight">{d.room.name}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">{PURPOSES[d.room.purpose]} · {ROLES[d.role ?? "viewer"]}</div>
          </div>
          <div className="space-y-1.5">
            {nav.map(([k, ic, label, n]) => (
              <Link key={k} to="/rooms/$roomId" params={{ roomId }} search={{ tab: k }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] ${tab === k ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-card/70"}`}>
                <span>{ic}</span>{label}{n !== null && <span className="ml-auto text-[10px]">{n}</span>}
              </Link>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          {tab === "overview" && (
            <>
              <div className="glass-panel p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="eyebrow mb-1">{PURPOSES[d.room.purpose]}</div>
                    <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{d.room.name}</h1>
                    <p className="mt-1 max-w-md text-[13px] text-muted-foreground">{d.room.description || `Salle ouverte à ${d.members.length} parties autorisées`}</p>
                  </div>
                  {canEdit && <Button variant="hero" onClick={() => fileRef.current?.click()}>+ Ajouter un document</Button>}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[["Documents", d.docs.length], ["Parties", d.members.length], ["Consultations", views], ["Dossiers", d.folders.length]].map(([l, v]) => (
                    <div key={l} className="glass-inset p-4"><div className="text-[11px] text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>
                  ))}
                </div>
              </div>
              <div className="glass-panel p-6"><div className="mb-4 text-[15px] font-semibold">Documents confidentiels</div>{DocTable}</div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="glass-panel p-6"><div className="mb-4 flex justify-between"><div className="text-[15px] font-semibold">Journal d'audit</div><div className="eyebrow text-accent">Traçabilité</div></div>{Journal(5)}</div>
                <div className="glass-panel p-6"><div className="mb-4 text-[15px] font-semibold">Audience</div>{Members}</div>
              </div>
            </>
          )}

          {tab === "documents" && (
            <div className="glass-panel p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFolder(null)} className={`rounded-lg px-3 py-1.5 text-[12px] ${folder === null ? "bg-primary text-primary-foreground" : "border border-line/25 bg-card/60 text-muted-foreground"}`}>Tous</button>
                  {d.folders.map((f) => (
                    <button key={f.id} onClick={() => setFolder(f.id)} className={`rounded-lg px-3 py-1.5 text-[12px] ${folder === f.id ? "bg-primary text-primary-foreground" : "border border-line/25 bg-card/60 text-muted-foreground"}`}>{f.name}</button>
                  ))}
                </div>
                {canEdit && <Button variant="hero" onClick={() => fileRef.current?.click()}>+ Déposer {folder ? `dans ${folderName(folder)}` : ""}</Button>}
              </div>
              {DocTable}
            </div>
          )}

          {tab === "audience" && (
            <div className="glass-panel p-6">
              <div className="mb-4 text-[15px] font-semibold">Audience</div>
              {isAdmin && (
                <form onSubmit={invite} className="glass-inset mb-6 grid gap-3 p-4 md:grid-cols-6">
                  <Input className="md:col-span-2" type="email" placeholder="email@cabinet.fr" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input placeholder="Organisation" value={org} onChange={(e) => setOrg(e.target.value)} />
                  <select className="rounded-md border border-input bg-card px-2 text-[13px]" value={party} onChange={(e) => setParty(e.target.value)}>
                    {Object.entries(PARTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className="rounded-md border border-input bg-card px-2 text-[13px]" value={role} onChange={(e) => setRole(e.target.value)}>
                    {["viewer", "editor", "admin"].map((k) => <option key={k} value={k}>{ROLES[k]}</option>)}
                  </select>
                  <Button type="submit" variant="hero">Inviter</Button>
                  <label className="flex items-center gap-2 text-[12px] text-muted-foreground md:col-span-6">
                    <input type="checkbox" checked={dl} onChange={(e) => setDl(e.target.checked)} /> Autoriser le téléchargement
                  </label>
                </form>
              )}
              {Members}
            </div>
          )}

          {tab === "journal" && <div className="glass-panel p-6"><div className="mb-4 text-[15px] font-semibold">Journal d'audit</div>{Journal(100)}</div>}
        </div>
      </div>
    </Shell>
  );
}
