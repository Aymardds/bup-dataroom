import { useState, useMemo } from "react";
import { toast } from "sonner";
import { initials } from "@/components/vault/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Download,
  FileUp,
  Trash2,
  UserPlus,
  UserX,
  FolderPlus,
  FolderMinus,
  ArrowRightLeft,
  ShieldCheck,
  Search,
  FileSpreadsheet,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export interface AuditLog {
  id: string;
  room_id: string;
  user_id?: string | null;
  actor_name: string | null;
  action: string;
  target: string | null;
  created_at: string;
}

export type ActionCategory = "all" | "views" | "downloads" | "files" | "members" | "folders";

interface ActionMeta {
  label: string;
  tone: "primary" | "accent" | "emerald" | "amber" | "destructive" | "iris" | "slate";
  icon: typeof Eye;
  badgeClass: string;
  iconClass: string;
  category: ActionCategory;
}

export function getActionMeta(action: string): ActionMeta {
  const norm = action.toLowerCase().trim();

  if (norm.includes("consulté") || norm === "a consulté") {
    return {
      label: "Consultation",
      tone: "primary",
      icon: Eye,
      badgeClass: "bg-primary/10 text-primary border-primary/25",
      iconClass: "text-primary",
      category: "views",
    };
  }

  if (norm.includes("téléchargé") || norm === "a téléchargé") {
    return {
      label: "Téléchargement",
      tone: "accent",
      icon: Download,
      badgeClass: "bg-accent/15 text-accent border-accent/30",
      iconClass: "text-accent",
      category: "downloads",
    };
  }

  if (norm.includes("déposé") || norm === "a déposé" || norm.includes("ajouté")) {
    return {
      label: "Dépôt fichier",
      tone: "emerald",
      icon: FileUp,
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      iconClass: "text-emerald-500",
      category: "files",
    };
  }

  if (norm.includes("invité") || norm === "a invité") {
    return {
      label: "Invitation",
      tone: "iris",
      icon: UserPlus,
      badgeClass: "bg-iris/15 text-iris border-iris/25",
      iconClass: "text-iris",
      category: "members",
    };
  }

  if (norm.includes("révoqué") || norm.includes("révoqué l'accès")) {
    return {
      label: "Révocation",
      tone: "destructive",
      icon: UserX,
      badgeClass: "bg-destructive/15 text-destructive border-destructive/25",
      iconClass: "text-destructive",
      category: "members",
    };
  }

  if (norm.includes("créé le dossier") || norm.includes("créé")) {
    return {
      label: "Nouveau dossier",
      tone: "amber",
      icon: FolderPlus,
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      iconClass: "text-amber-500",
      category: "folders",
    };
  }

  if (norm.includes("supprimé le dossier")) {
    return {
      label: "Suppression dossier",
      tone: "destructive",
      icon: FolderMinus,
      badgeClass: "bg-destructive/15 text-destructive border-destructive/25",
      iconClass: "text-destructive",
      category: "folders",
    };
  }

  if (norm.includes("supprimé")) {
    return {
      label: "Suppression fichier",
      tone: "destructive",
      icon: Trash2,
      badgeClass: "bg-destructive/15 text-destructive border-destructive/25",
      iconClass: "text-destructive",
      category: "files",
    };
  }

  if (norm.includes("déplacé") || norm === "a déplacé") {
    return {
      label: "Déplacement",
      tone: "slate",
      icon: ArrowRightLeft,
      badgeClass: "bg-muted text-muted-foreground border-border",
      iconClass: "text-muted-foreground",
      category: "files",
    };
  }

  return {
    label: action,
    tone: "slate",
    icon: Activity,
    badgeClass: "bg-card text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
    category: "all",
  };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let relative = "";
  if (diffMin < 1) relative = "À l'instant";
  else if (diffMin < 60) relative = `Il y a ${diffMin} min`;
  else if (diffMin < 1440) relative = `Il y a ${Math.floor(diffMin / 60)} h`;

  const formattedDate = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return { formattedDate, formattedTime, relative };
}

/**
 * Exporte les logs au format CSV avec encodage UTF-8 BOM pour Excel
 */
export function exportAuditLogsToCsv(logs: AuditLog[], roomName: string) {
  if (!logs.length) {
    toast.error("Aucune donnée à exporter");
    return;
  }

  const headers = ["ID", "Horodatage ISO", "Date", "Heure", "Utilisateur", "Action", "Cible"];
  const rows = logs.map((l) => {
    const d = new Date(l.created_at);
    const date = d.toLocaleDateString("fr-FR");
    const time = d.toLocaleTimeString("fr-FR");
    const meta = getActionMeta(l.action);
    return [
      l.id,
      l.created_at,
      date,
      time,
      `"${(l.actor_name || "Anonyme").replace(/"/g, '""')}"`,
      `"${meta.label.replace(/"/g, '""')}"`,
      `"${(l.target || "—").replace(/"/g, '""')}"`,
    ].join(";");
  });

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `journal-audit-${safeName}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success(`Journal d'audit exporté avec succès (${logs.length} lignes)`);
}

/**
 * Composant complet du Journal d'Audit pour la section dédiée (tab === "journal")
 */
export function AuditTrailView({
  logs,
  roomName,
  isAdmin,
}: {
  logs: AuditLog[];
  roomName: string;
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ActionCategory>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Statistiques rapides pour les compteurs KPI
  const stats = useMemo(() => {
    const total = logs.length;
    let views = 0;
    let downloads = 0;
    let files = 0;
    let members = 0;
    let folders = 0;

    for (const l of logs) {
      const meta = getActionMeta(l.action);
      if (meta.category === "views") views++;
      else if (meta.category === "downloads") downloads++;
      else if (meta.category === "files") files++;
      else if (meta.category === "members") members++;
      else if (meta.category === "folders") folders++;
    }

    return { total, views, downloads, files, members, folders };
  }, [logs]);

  // Filtrage des logs
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();
    const query = search.toLowerCase().trim();

    return logs
      .filter((l) => {
        // Filtre de catégorie
        if (category !== "all") {
          const meta = getActionMeta(l.action);
          if (meta.category !== category) return false;
        }

        // Filtre de date
        if (dateFilter !== "all") {
          const logTime = new Date(l.created_at).getTime();
          const diffHours = (now - logTime) / (1000 * 60 * 60);
          if (dateFilter === "today" && diffHours > 24) return false;
          if (dateFilter === "7d" && diffHours > 24 * 7) return false;
          if (dateFilter === "30d" && diffHours > 24 * 30) return false;
        }

        // Filtre de recherche texte
        if (query) {
          const actor = (l.actor_name || "").toLowerCase();
          const target = (l.target || "").toLowerCase();
          const action = l.action.toLowerCase();
          const meta = getActionMeta(l.action);
          if (
            !actor.includes(query) &&
            !target.includes(query) &&
            !action.includes(query) &&
            !meta.label.toLowerCase().includes(query)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [logs, category, dateFilter, search, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  if (!isAdmin) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold">Accès confidentiel restreint</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Le journal d'audit complet de la data room est strictement réservé aux administrateurs et propriétaires.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Barres de KPI d'audit */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Événements
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Journal immuable certifié
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Consultations
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.views}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Lectures sous scellé
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Téléchargements
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.downloads}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Copies locales autorisées
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Actions d'accès
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-iris/15 text-iris">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.members + stats.files}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {stats.members} invit. · {stats.files} fichiers
          </div>
        </div>
      </div>

      {/* 2. Barre d'outils, filtres et export */}
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Journal d'audit &amp; Traçabilité</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                Norme VDR
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Chaque ouverture, téléchargement, invitation et suppression est scellé avec horodatage strict.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAuditLogsToCsv(filteredLogs, roomName)}
              className="h-9 gap-2 border-line/40 bg-card/70 text-xs font-medium hover:border-primary/40 hover:bg-card"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              Exporter en CSV ({filteredLogs.length})
            </Button>
          </div>
        </div>

        {/* Filtres de recherche et sélecteurs */}
        <div className="mt-5 grid gap-3 md:grid-cols-12">
          {/* Recherche textuelle */}
          <div className="relative md:col-span-6 lg:col-span-6">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par utilisateur, document, action..."
              className="h-9 pl-9 text-xs"
            />
          </div>

          {/* Filtre de période */}
          <div className="flex gap-2 md:col-span-3 lg:col-span-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Dernières 24h</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
            </div>
          </div>

          {/* Tri */}
          <div className="flex items-center gap-2 md:col-span-3 lg:col-span-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="h-9 w-full justify-between border-line/40 bg-card/70 text-xs"
            >
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                {sortOrder === "desc" ? "Plus récents d'abord" : "Plus anciens d'abord"}
              </span>
            </Button>
          </div>
        </div>

        {/* Boutons Pills de catégories */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line/20 pt-4">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">Catégorie :</span>
          {(
            [
              ["all", "Tous", stats.total],
              ["views", "Consultations", stats.views],
              ["downloads", "Téléchargements", stats.downloads],
              ["files", "Fichiers", stats.files],
              ["members", "Invitations", stats.members],
              ["folders", "Dossiers", stats.folders],
            ] as const
          ).map(([cat, label, count]) => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "border border-line/25 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Tableau moderne du Journal d'Audit */}
        <div className="mt-5 overflow-hidden rounded-xl border border-line/30 bg-card/40">
          <div className="grid grid-cols-12 gap-3 border-b border-line/20 bg-card/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3 sm:col-span-2">Date &amp; Heure</div>
            <div className="col-span-4 sm:col-span-3">Utilisateur</div>
            <div className="col-span-3 sm:col-span-3">Action</div>
            <div className="col-span-2 sm:col-span-3">Document / Cible</div>
            <div className="hidden sm:col-span-1 sm:block text-right">Preuve</div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium">Aucun événement ne correspond à vos filtres</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Essayez d'élargir la période ou de réinitialiser la recherche.
              </p>
              {(search || category !== "all" || dateFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                    setDateFilter("all");
                  }}
                  className="mt-4 text-xs"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-line/15">
              {paginatedLogs.map((l) => {
                const meta = getActionMeta(l.action);
                const ActionIcon = meta.icon;
                const { formattedDate, formattedTime, relative } = formatDate(l.created_at);

                return (
                  <div
                    key={l.id}
                    className="grid grid-cols-12 items-center gap-3 px-4 py-3 transition hover:bg-primary/[0.03]"
                  >
                    {/* Date & Heure */}
                    <div className="col-span-3 sm:col-span-2">
                      <div className="font-mono text-xs font-medium text-foreground">{formattedDate}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{formattedTime}</span>
                        {relative && <span className="hidden lg:inline text-[10px] opacity-75">({relative})</span>}
                      </div>
                    </div>

                    {/* Utilisateur */}
                    <div className="col-span-4 sm:col-span-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {initials(l.actor_name || "Anonyme")}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="truncate text-xs font-medium text-foreground" title={l.actor_name || "—"}>
                            {l.actor_name || "Utilisateur anonyme"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Accès certifié</div>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="col-span-3 sm:col-span-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${meta.badgeClass}`}
                      >
                        <ActionIcon className={`h-3.5 w-3.5 shrink-0 ${meta.iconClass}`} />
                        <span className="truncate">{meta.label}</span>
                      </span>
                    </div>

                    {/* Document ou cible */}
                    <div className="col-span-2 sm:col-span-3 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-foreground" title={l.target || "—"}>
                          {l.target ? (
                            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                              {l.target}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Badge scellé / vérifié */}
                    <div className="hidden sm:col-span-1 sm:flex justify-end">
                      <span
                        title="Horodatage infalsifiable en base de données"
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        Scellé
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Barre de pagination */}
        {filteredLogs.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-xs text-muted-foreground">
              Affichage de <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> à{" "}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * pageSize, filteredLogs.length)}
              </span>{" "}
              sur <span className="font-medium text-foreground">{filteredLogs.length}</span> événements
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Par page :</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-input bg-card px-1.5 py-1 text-xs text-foreground"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs text-muted-foreground">
                  Page <strong className="text-foreground">{currentPage}</strong> sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Aperçu compact du Journal d'Audit pour l'onglet Vue d'ensemble (tab === "overview")
 */
export function AuditTrailOverviewWidget({
  logs,
  onViewAll,
  isAdmin,
}: {
  logs: AuditLog[];
  onViewAll: () => void;
  isAdmin: boolean;
}) {
  if (!isAdmin) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        Réservé aux administrateurs de la salle.
      </div>
    );
  }

  const recentLogs = logs.slice(0, 5);

  if (recentLogs.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        Aucune activité enregistrée pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentLogs.map((l) => {
        const meta = getActionMeta(l.action);
        const ActionIcon = meta.icon;
        const { formattedDate, formattedTime, relative } = formatDate(l.created_at);

        return (
          <div
            key={l.id}
            className="group flex items-center justify-between gap-3 rounded-xl border border-line/15 bg-card/40 p-2.5 transition hover:border-line/30 hover:bg-card/70"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.badgeClass}`}
              >
                <ActionIcon className={`h-4 w-4 ${meta.iconClass}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium text-foreground">
                    {l.actor_name || "Utilisateur"}
                  </span>
                  <span className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>
                {l.target && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    Cible : <span className="font-mono text-foreground/80">{l.target}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="font-mono text-[11px] text-foreground">{formattedTime}</div>
              <div className="text-[10px] text-muted-foreground">{relative || formattedDate}</div>
            </div>
          </div>
        );
      })}

      <div className="pt-2 text-center">
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline"
        >
          <span>Accéder au journal d'audit complet ({logs.length} événements)</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
