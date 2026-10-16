import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Pill, SignOutButton, PURPOSES, ROLES, PARTIES, initials } from "@/components/vault/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomStats } from "@/components/vault/RoomStats";
import { sendRoomInvitation } from "@/lib/emailService";
import { AuditTrailView, AuditTrailOverviewWidget } from "@/components/vault/AuditTrail";
import { DocumentWebPreview, type PreviewDoc } from "@/components/vault/DocumentWebPreview";
import { SocialSharePreview } from "@/components/vault/SocialSharePreview";
import { Eye, Download, Share2 } from "lucide-react";

type Tab = "overview" | "documents" | "audience" | "journal";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => {
    const t = s["tab"];
    return { tab: ["overview", "documents", "audience", "journal"].includes(t as string) ? (t as Tab) : undefined };
  },
  head: () => ({ meta: [{ title: "Data room — BUP (Business Up)" }] }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [party, setParty] = useState("investisseur");
  const [role, setRole] = useState("viewer");
  const [dl, setDl] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const q = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const [room, roleR, folders, docs, members, logs, canDl] = await Promise.all([
        supabase.from("data_rooms").select("*").eq("id", roomId).single(),
        supabase.rpc("room_role", { _room: roomId }),
        supabase.from("folders").select("*").eq("room_id", roomId).order("position"),
        supabase.from("documents").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
        supabase.from("room_members").select("*").eq("room_id", roomId).order("created_at"),
        supabase.from("activity_logs").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(500),
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

  async function openPreview(doc: (typeof d.docs)[number]) {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    try {
      const { data, error } = await supabase.storage.from("dataroom").createSignedUrl(doc.storage_path, 3600);
      if (error) {
        toast.error(error.message);
        return;
      }
      setPreviewUrl(data.signedUrl);
      await supabase.rpc("record_view", { _doc: doc.id });
      await log("a consulté", doc.name);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function downloadDoc(doc: { id: string; name: string; storage_path: string }) {
    try {
      const { data, error } = await supabase.storage.from("dataroom").createSignedUrl(doc.storage_path, 60, { download: doc.name });
      if (error) {
        toast.error(error.message);
        return;
      }
      await supabase.rpc("record_view", { _doc: doc.id });
      await log("a téléchargé", doc.name);
      window.open(data.signedUrl, "_blank");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function remove(doc: (typeof d.docs)[number]) {
    await supabase.storage.from("dataroom").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await log("a supprimé", doc.name);
    refresh();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    const { error } = await supabase.from("room_members").insert({
      room_id: roomId,
      email: cleanEmail,
      organization: org || null,
      party_type: party,
      role,
      can_download: dl,
    });
    if (error) { toast.error(error.message); return; }
    await log("a invité", cleanEmail);

    const emailResult = await sendRoomInvitation({
      toEmail: cleanEmail,
      toName: org || undefined,
      organization: org || undefined,
      roomName: d.room.name,
      roomPurpose: PURPOSES[d.room.purpose] ?? d.room.purpose,
      roleName: ROLES[role] ?? role,
      canDownload: dl,
      inviterEmail: user.email ?? undefined,
      accessUrl: `${window.location.origin}/auth?redirect=/rooms/${roomId}`,
    });

    if (emailResult.success) {
      toast.success("Invitation enregistrée et email transmis avec succès !");
    } else if (emailResult.notConfigured) {
      toast.success("Invitation enregistrée — la personne doit créer un compte avec cet e-mail.");
    } else {
      toast.warning(`Invitation enregistrée, mais l'email n'a pas pu être délivré : ${emailResult.message}`);
    }

    setEmail(""); setOrg("");
    refresh();
  }

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolder.trim();
    if (!name) return;
    const { error } = await supabase.from("folders").insert({ room_id: roomId, name, position: d.folders.length });
    if (error) { toast.error(error.message); return; }
    await log("a créé le dossier", name);
    setNewFolder("");
    refresh();
  }

  async function deleteFolder(id: string, name: string) {
    if (!confirm(`Supprimer le dossier « ${name} » ? Les documents passeront dans « Sans dossier ».`)) return;
    await supabase.from("folders").delete().eq("id", id);
    await log("a supprimé le dossier", name);
    if (folder === id) setFolder(null);
    refresh();
  }

  async function moveDoc(id: string, folderId: string | null, name: string) {
    const { error } = await supabase.from("documents").update({ folder_id: folderId }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await log("a déplacé", `${name} → ${folderName(folderId)}`);
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
    ["journal", "⤢", "Journal d'audit", d.logs.length],
  ];

  const DocTable = (
    <div className="glass-inset overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_90px_100px_160px] gap-4 border-b border-line/20 px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Nom</span><span>Dossier</span><span>Vues</span><span>Ajouté</span><span className="text-right">Actions</span>
      </div>
      {visibleDocs.length === 0 && <div className="px-4 py-6 text-[13px] text-muted-foreground">Aucun document.</div>}
      {visibleDocs.map((doc) => (
        <div key={doc.id} className="grid grid-cols-[1fr_120px_90px_100px_160px] items-center gap-4 border-b border-line/15 px-4 py-3 hover:bg-primary/5">
          <button
            onClick={() => openPreview(doc)}
            className="group flex min-w-0 items-center gap-2.5 text-left"
            title="Prévisualiser dans le navigateur"
          >
            <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
              {(doc.name.split(".").pop() ?? "").slice(0, 4).toUpperCase()}
            </span>
            <span className="truncate text-[13px] font-medium transition group-hover:text-primary">
              {doc.name}
            </span>
          </button>
          <div className="text-[12px] text-muted-foreground">{folderName(doc.folder_id)}</div>
          <div className="text-[12px] font-medium">{doc.view_count}</div>
          <div className="text-[12px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</div>
          <div className="flex justify-end items-center gap-2 text-[12px]">
            <button
              className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => openPreview(doc)}
              title="Prévisualiser dans la visionneuse web"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Aperçu</span>
            </button>
            {d.canDl && (
              <button
                className="inline-flex items-center text-accent hover:underline"
                onClick={() => downloadDoc(doc)}
                title="Télécharger une copie autorisée"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            {isAdmin && (
              <button className="text-destructive hover:underline text-[11px]" onClick={() => remove(doc)}>
                Suppr.
              </button>
            )}
          </div>
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
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Dossier BUP</div>
              <div className="flex h-5 w-5 items-center justify-center rounded border border-line/40 bg-card/80 p-0.5">
                <img
                  src="/icone-128.png"
                  alt="BUP"
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="eyebrow mb-1">{PURPOSES[d.room.purpose]}</div>
                    <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{d.room.name}</h1>
                    <p className="mt-1 max-w-md text-[13px] text-muted-foreground">{d.room.description || `Salle ouverte à ${d.members.length} parties autorisées`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShareModalOpen(true)}
                      className="h-10 gap-2 border-line/30 bg-card/70 text-xs hover:border-primary/40 hover:bg-card"
                      title="Simulateur d'aperçu de partage Web & SEO"
                    >
                      <Share2 className="h-4 w-4 text-primary" />
                      <span>Aperçu Web &amp; Partage</span>
                    </Button>
                    {canEdit && <Button variant="hero" onClick={() => fileRef.current?.click()}>+ Ajouter un document</Button>}
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[["Documents", d.docs.length], ["Parties", d.members.length], ["Consultations", views], ["Dossiers", d.folders.length]].map(([l, v]) => (
                    <div key={l} className="glass-inset p-4"><div className="text-[11px] text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>
                  ))}
                </div>
              </div>
              <RoomStats logs={d.logs} docs={d.docs} folders={d.folders} members={d.members} />
              <div className="glass-panel p-6"><div className="mb-4 text-[15px] font-semibold">Documents confidentiels</div>{DocTable}</div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="glass-panel p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-[15px] font-semibold">Journal d'audit récent</div>
                      <div className="text-[11px] text-muted-foreground">5 dernières activités tracées</div>
                    </div>
                    <div className="eyebrow text-accent">Traçabilité</div>
                  </div>
                  <AuditTrailOverviewWidget
                    logs={d.logs}
                    onViewAll={() => navigate({ to: "/rooms/$roomId", params: { roomId }, search: { tab: "journal" } })}
                    isAdmin={isAdmin}
                  />
                </div>
                <div className="glass-panel p-6"><div className="mb-4 text-[15px] font-semibold">Audience</div>{Members}</div>
              </div>
            </>
          )}

          {tab === "documents" && (
            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
              <div className="glass-panel h-fit p-4">
                <div className="eyebrow mb-3">Arborescence</div>
                <button onClick={() => setFolder(null)} className={`flex w-full items-center rounded-xl px-3 py-2 text-[13px] ${folder === null ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-card/70"}`}>
                  ▦ Tous les documents<span className="ml-auto text-[10px]">{d.docs.length}</span>
                </button>
                {d.folders.map((f) => (
                  <div key={f.id} className="group flex items-center">
                    <button onClick={() => setFolder(f.id)} className={`flex flex-1 items-center rounded-xl px-3 py-2 text-[13px] ${folder === f.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-card/70"}`}>
                      ▸ {f.name}<span className="ml-auto text-[10px]">{d.docs.filter((x) => x.folder_id === f.id).length}</span>
                    </button>
                    {isAdmin && (
                      <button title="Supprimer le dossier" className="px-1 text-[11px] text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteFolder(f.id, f.name)}>✕</button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <form onSubmit={createFolder} className="mt-3 flex gap-2">
                    <Input placeholder="Nouveau dossier" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} className="h-8 text-[12px]" />
                    <Button type="submit" size="sm" variant="hero">+</Button>
                  </form>
                )}
              </div>
              <div className="glass-panel p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">Dossier</div>
                    <div className="text-[18px] font-semibold">{folder ? folderName(folder) : "Tous les documents"}</div>
                  </div>
                  {canEdit && <Button variant="hero" onClick={() => fileRef.current?.click()}>+ Déposer {folder ? `dans ${folderName(folder)}` : ""}</Button>}
                </div>
                {folder ? DocTable : (
                  <div className="space-y-6">
                    {[...d.folders.map((f) => ({ id: f.id as string | null, name: f.name })), { id: null, name: "Sans dossier" }].map((f) => {
                      const docs = d.docs.filter((x) => x.folder_id === f.id);
                      if (f.id === null && docs.length === 0) return null;
                      return (
                        <div key={f.id ?? "none"}>
                          <button onClick={() => f.id && setFolder(f.id)} className="mb-2 flex items-center gap-2 text-[13px] font-semibold hover:text-primary">
                            ▸ {f.name} <span className="text-[11px] font-normal text-muted-foreground">{docs.length} document(s)</span>
                          </button>
                          <div className="glass-inset overflow-hidden">
                            {docs.length === 0 && <div className="px-4 py-3 text-[12px] text-muted-foreground">Dossier vide.</div>}
                            {docs.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-3 border-b border-line/15 px-4 py-2.5 text-[13px] last:border-0 hover:bg-primary/5">
                                <button
                                  onClick={() => openPreview(doc)}
                                  className="truncate font-medium text-left hover:text-primary transition"
                                  title="Prévisualiser le document"
                                >
                                  {doc.name}
                                </button>
                                <span className="ml-auto text-[11px] text-muted-foreground">{doc.view_count} vues</span>
                                {canEdit && (
                                  <select className="rounded-md border border-input bg-card px-1 text-[11px]" value={doc.folder_id ?? ""} onChange={(e) => moveDoc(doc.id, e.target.value || null, doc.name)}>
                                    <option value="">Sans dossier</option>
                                    {d.folders.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                  </select>
                                )}
                                <button className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline" onClick={() => openPreview(doc)}>
                                  <Eye className="h-3 w-3" />
                                  <span>Aperçu</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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

          {tab === "journal" && (
            <AuditTrailView logs={d.logs} roomName={d.room.name} isAdmin={isAdmin} />
          )}
        </div>
      </div>

      {/* Visionneuse Web de documents intégrée avec filigrane de sécurité */}
      <DocumentWebPreview
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
        signedUrl={previewUrl}
        canDownload={d.canDl}
        onDownload={previewDoc ? () => downloadDoc(previewDoc) : undefined}
        folderName={previewDoc ? folderName(previewDoc.folder_id) : ""}
        userEmail={user.email ?? undefined}
        roomName={d.room.name}
      />

      {/* Simulateur d'aperçu de partage Web & SEO */}
      <SocialSharePreview
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={`Data Room : ${d.room.name} — BUP (Business Up)`}
        description={d.room.description || `Accédez aux documents sécurisés sous scellé de la data room ${d.room.name}. Chiffrement bancaire AES-256 et traçabilité certifiée.`}
        url={`${window.location.origin}/auth?redirect=/rooms/${roomId}`}
        imageUrl="/og-image.png"
        roomPurpose={PURPOSES[d.room.purpose] ?? "Data room sécurisée"}
      />
    </Shell>
  );
}
