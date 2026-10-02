import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Pill, SignOutButton, PURPOSES } from "@/components/vault/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "Mes data rooms — Salle des Coffres" },
      { name: "description", content: "Toutes vos data rooms : levées de fonds, due diligence, cessions." },
    ],
  }),
  component: RoomsPage,
});

const DEFAULT_FOLDERS = ["Juridique", "Financier", "Ressources humaines", "Commercial", "Technique"];

function RoomsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("levee_de_fonds");
  const [description, setDescription] = useState("");

  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_rooms")
        .select("*, documents(count), room_members(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("data_rooms")
      .insert({ name, purpose, description, owner_id: user.id })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("folders").insert(DEFAULT_FOLDERS.map((n, i) => ({ room_id: data.id, name: n, position: i })));
    await supabase.from("activity_logs").insert({ room_id: data.id, user_id: user.id, actor_name: user.email, action: "a créé la data room", target: name });
    qc.invalidateQueries({ queryKey: ["rooms"] });
    setOpen(false);
    navigate({ to: "/rooms/$roomId", params: { roomId: data.id } });
  }

  return (
    <Shell right={<><Pill>{user.email}</Pill><SignOutButton /></>}>
      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="eyebrow mb-1">Espace de travail</div>
            <h1 className="text-[26px] font-semibold tracking-tight">Mes data rooms</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Salles que vous gérez ou auxquelles vous êtes invité.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">+ Nouvelle data room</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle data room</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-1.5"><Label>Nom de l'opération</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Série B — Lumen AI" required /></div>
                <div className="space-y-1.5">
                  <Label>Objet</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PURPOSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <p className="text-[12px] text-muted-foreground">Dossiers créés automatiquement : {DEFAULT_FOLDERS.join(", ")}.</p>
                <Button type="submit" variant="hero" className="w-full">Créer la salle</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rooms.isLoading && <div className="text-muted-foreground">Chargement…</div>}
        {rooms.data?.length === 0 && (
          <div className="glass-panel p-6 text-[13px] text-muted-foreground md:col-span-3">
            Aucune data room pour l'instant. Créez votre première salle pour y déposer vos documents.
          </div>
        )}
        {rooms.data?.map((r) => (
          <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }} search={{ tab: "overview" }} className="glass-panel block p-6 transition hover:-translate-y-0.5">
            <div className="eyebrow">{PURPOSES[r.purpose] ?? r.purpose}</div>
            <div className="mt-1 text-[18px] font-semibold leading-tight">{r.name}</div>
            {r.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{r.description}</p>}
            <div className="mt-4 flex gap-3 text-[12px] text-muted-foreground">
              <span className="glass-inset px-3 py-1.5">{r.documents[0]?.count ?? 0} documents</span>
              <span className="glass-inset px-3 py-1.5">{r.room_members[0]?.count ?? 0} parties</span>
              {r.owner_id === user.id && <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">Propriétaire</span>}
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
