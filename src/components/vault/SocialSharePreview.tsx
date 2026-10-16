import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  X,
  Copy,
  Check,
  Share2,
  Globe,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface SocialSharePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  roomPurpose?: string;
}

export function SocialSharePreview({
  isOpen,
  onClose,
  title,
  description,
  url,
  imageUrl = "/og-image.png",
  roomPurpose = "Data room confidentielle",
}: SocialSharePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<"linkedin" | "twitter" | "whatsapp" | "slack">("linkedin");

  if (!isOpen) return null;

  function copyToClipboard() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Lien d'accès sécurisé copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2500);
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname : "found-office.lovable.app";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line/40 bg-card/95 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-line/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Aperçu Web &amp; Partage SEO</h3>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Social Preview
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Voici comment vos partenaires et investisseurs visualisent le lien sur le web.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-full p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Choix de plateforme */}
        <div className="mt-4 flex gap-1.5 border-b border-line/15 pb-3">
          {(
            [
              ["linkedin", "LinkedIn"],
              ["twitter", "Twitter / X"],
              ["whatsapp", "WhatsApp"],
              ["slack", "Slack"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPlatform(key)}
              className={`rounded-lg px-3 py-1 text-xs transition ${
                platform === key
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Carte de simulation Open Graph / Twitter Card */}
        <div className="mt-4">
          <div className="overflow-hidden rounded-xl border border-line/40 bg-card shadow-lg">
            {/* Image d'aperçu */}
            <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted/30">
              <img
                src={imageUrl}
                alt="Aperçu web BUP"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo-bup.png";
                }}
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground backdrop-blur-md">
                <Globe className="h-3 w-3 text-primary" />
                {hostname}
              </div>
            </div>

            {/* Contenu textuel */}
            <div className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                BUP • {roomPurpose}
              </div>
              <h4 className="mt-1 text-sm font-bold leading-snug text-foreground">{title}</h4>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              <div className="mt-2 text-[10px] text-muted-foreground font-mono truncate">{url}</div>
            </div>
          </div>
        </div>

        {/* Barre de copie de lien */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-medium text-foreground">Lien d'accès direct sécurisé :</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="h-9 flex-1 rounded-lg border border-input bg-muted/40 px-3 font-mono text-xs text-foreground focus:outline-none"
            />
            <Button variant="hero" size="sm" onClick={copyToClipboard} className="h-9 gap-1.5 px-3">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copié !" : "Copier"}</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line/15 pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            Balises Open Graph &amp; Twitter Cards configurées
          </span>
          <button onClick={() => window.open(url, "_blank")} className="flex items-center gap-1 hover:text-primary">
            <span>Tester le lien</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
