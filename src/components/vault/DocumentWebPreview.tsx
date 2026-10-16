import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode,
  File,
  Shield,
  Eye,
  Lock,
  Sparkles,
} from "lucide-react";

export interface PreviewDoc {
  id: string;
  name: string;
  folder_id: string | null;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
  view_count: number;
  storage_path: string;
  room_id?: string | undefined;
  uploaded_by?: string | null | undefined;
}

interface DocumentWebPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  doc: PreviewDoc | null;
  signedUrl: string | null;
  canDownload: boolean;
  onDownload?: (() => void | Promise<void>) | undefined;
  folderName: string;
  userEmail?: string | undefined;
  roomName: string;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return "0 Octet";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Octets", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileCategory(name: string, mime?: string | null) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();

  if (ext === "pdf" || m.includes("pdf")) return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || m.includes("image/")) return "image";
  if (["xls", "xlsx", "csv"].includes(ext) || m.includes("spreadsheet") || m.includes("csv")) return "sheet";
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext) || m.includes("document") || m.includes("text/")) return "doc";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || m.includes("zip") || m.includes("compressed")) return "archive";
  if (["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "sql"].includes(ext)) return "code";
  return "other";
}

function FileTypeIcon({ category }: { category: string }) {
  switch (category) {
    case "pdf":
      return <FileText className="h-5 w-5 text-rose-500" />;
    case "image":
      return <FileImage className="h-5 w-5 text-emerald-500" />;
    case "sheet":
      return <FileSpreadsheet className="h-5 w-5 text-accent" />;
    case "doc":
      return <FileText className="h-5 w-5 text-primary" />;
    case "archive":
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    case "code":
      return <FileCode className="h-5 w-5 text-iris" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

export function DocumentWebPreview({
  isOpen,
  onClose,
  doc,
  signedUrl,
  canDownload,
  onDownload,
  folderName,
  userEmail,
  roomName,
}: DocumentWebPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen || !doc) return null;

  const category = getFileCategory(doc.name, doc.mime_type);
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const watermarkText = `CONFIDENTIEL • BUP (Business Up) • ${userEmail || "UTILISATEUR AUTORISÉ"} • ${dateStr} • ${roomName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Window */}
      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-line/40 bg-card/95 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isFullscreen ? "fixed inset-0 h-full max-h-screen rounded-none" : "h-[90vh] max-w-5xl"
        }`}
      >
        {/* Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-line/25 bg-card/90 px-4 py-3 backdrop-blur-lg sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/30 bg-background/80 shadow-inner">
              <FileTypeIcon category={category} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-bold text-foreground sm:text-base" title={doc.name}>
                  {doc.name}
                </h2>
                <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Web Preview
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{folderName}</span>
                <span>•</span>
                <span>{formatBytes(doc.size_bytes)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-primary" />
                  {doc.view_count} vues
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-3 w-3" />
                  Chiffrement AES-256
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {canDownload && onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                className="h-8 gap-1.5 border-line/30 bg-card/70 px-2.5 text-xs text-foreground hover:border-primary/40 hover:bg-card"
                title="Télécharger une copie locale autorisée"
              >
                <Download className="h-3.5 w-3.5 text-accent" />
                <span className="hidden sm:inline">Télécharger</span>
              </Button>
            )}

            {signedUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(signedUrl, "_blank")}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title={isFullscreen ? "Réduire" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Fermer la prévisualisation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-2 sm:p-4">
          {/* Filigrane de sécurité VDR BUP */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 flex select-none flex-col items-center justify-around overflow-hidden opacity-[0.06] dark:opacity-[0.08]"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="-rotate-12 whitespace-nowrap text-[13px] font-mono font-bold tracking-widest text-foreground"
              >
                {watermarkText} • {watermarkText}
              </div>
            ))}
          </div>

          {/* Viewer selon type de document */}
          {!signedUrl ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="animate-spin rounded-full border-2 border-primary border-t-transparent h-8 w-8" />
              <p className="mt-3 text-sm text-muted-foreground">Génération du lien sécurisé sous scellé...</p>
            </div>
          ) : loadError ? (
            <div className="glass-panel mx-auto max-w-md p-6 text-center">
              <Shield className="mx-auto h-8 w-8 text-amber-500" />
              <h3 className="mt-3 text-sm font-semibold">Prévisualisation directe indisponible</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Ce type de fichier ({doc.name.split(".").pop()?.toUpperCase()}) nécessite une application tierce pour être ouvert.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" variant="hero" onClick={() => window.open(signedUrl, "_blank")}>
                  Ouvrir le document
                </Button>
                {canDownload && onDownload && (
                  <Button size="sm" variant="outline" onClick={onDownload}>
                    Télécharger ({formatBytes(doc.size_bytes)})
                  </Button>
                )}
              </div>
            </div>
          ) : category === "pdf" ? (
            <iframe
              src={`${signedUrl}#toolbar=0&navpanes=0`}
              title={doc.name}
              onError={() => setLoadError(true)}
              className="h-full w-full rounded-xl border border-line/20 bg-background shadow-inner"
            />
          ) : category === "image" ? (
            <div className="flex h-full w-full items-center justify-center p-4">
              <img
                src={signedUrl}
                alt={doc.name}
                onError={() => setLoadError(true)}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl transition duration-200"
              />
            </div>
          ) : (
            <div className="glass-panel mx-auto max-w-md p-8 text-center shadow-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-line/40 bg-card/80 shadow-inner">
                <FileTypeIcon category={category} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{doc.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Dossier {folderName} • {formatBytes(doc.size_bytes)}
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button variant="hero" onClick={() => window.open(signedUrl, "_blank")} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir dans un nouvel onglet
                </Button>
                {canDownload && onDownload && (
                  <Button variant="outline" onClick={onDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger le document ({formatBytes(doc.size_bytes)})
                  </Button>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Document chiffré et sécurisé par BUP</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex shrink-0 items-center justify-between border-t border-line/20 bg-card/75 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Consultation sous scellé numérique BUP</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>Raccourci : <strong>Échap</strong> pour fermer</span>
            <span>•</span>
            <span className="font-mono">{roomName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
