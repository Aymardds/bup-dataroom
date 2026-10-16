import emailjs from "@emailjs/browser";

export interface RoomInvitationParams {
  toEmail: string;
  toName?: string;
  organization?: string;
  roomName: string;
  roomPurpose: string;
  roleName: string;
  canDownload: boolean;
  inviterName?: string;
  inviterEmail?: string;
  accessUrl: string;
}

export interface EmailResult {
  success: boolean;
  notConfigured?: boolean;
  message?: string;
}

/**
 * Génère un template HTML d'e-mail de qualité bancaire/VDR,
 * compatible avec tous les clients de messagerie (Gmail, Outlook, Apple Mail).
 */
export function generateInvitationHtml(params: RoomInvitationParams): string {
  const recipientName = params.toName || params.organization || params.toEmail.split("@")[0];
  const downloadBadge = params.canDownload
    ? `<span style="display:inline-block;padding:4px 10px;border-radius:20px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size:12px;font-weight:600;">✓ Téléchargement autorisé</span>`
    : `<span style="display:inline-block;padding:4px 10px;border-radius:20px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;font-size:12px;font-weight:600;">🔒 Consultation sous scellé uniquement</span>`;

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accréditation Data Room — BUP (Business Up)</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08);">
          
          <!-- Top Gradient Bar -->
          <tr>
            <td height="5" style="background:linear-gradient(90deg,#4f46e5,#7c3aed,#06b6d4);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding:32px 36px 24px;background-color:#0f172a;text-align:left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display:inline-block;padding:6px 12px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.35);border-radius:30px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#a5b4fc;text-transform:uppercase;">
                      🔒 BUP • BUSINESS UP — VDR SÉCURISÉE
                    </div>
                    <h1 style="margin:16px 0 6px;color:#f8fafc;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.4px;">
                      Accréditation confidentielle accordée
                    </h1>
                    <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.5;">
                      Accès sécurisé réservé aux parties prenantes autorisées.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 36px;background-color:#ffffff;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
                Bonjour <strong>${recipientName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                Vous avez été officiellement invité(e) par <strong>${params.inviterName || params.inviterEmail || "l'administrateur"}</strong> à accéder aux documents confidentiels de la data room ci-dessous :
              </p>

              <!-- Specification Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:28px;">
                <tr>
                  <td style="padding:22px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                          <div style="font-size:11px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:3px;">Opération</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${params.roomName}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <div style="font-size:11px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:3px;">Objet</div>
                          <div style="font-size:14px;font-weight:600;color:#1e293b;">${params.roomPurpose}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="50%">
                                <div style="font-size:11px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:3px;">Organisation</div>
                                <div style="font-size:13px;font-weight:600;color:#1e293b;">${params.organization || "Partie invitée"}</div>
                              </td>
                              <td width="50%">
                                <div style="font-size:11px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:3px;">Niveau d'accès</div>
                                <div style="font-size:13px;font-weight:600;color:#4f46e5;">${params.roleName}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;">
                          <div style="font-size:11px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px;">Politique d'export</div>
                          <div>${downloadBadge}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${params.accessUrl}" target="_blank" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:12px;box-shadow:0 8px 24px rgba(79,70,229,0.35);letter-spacing:0.2px;">
                      Ouvrir la Data Room BUP →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien sécurisé dans votre navigateur :<br>
                <a href="${params.accessUrl}" style="color:#4f46e5;text-decoration:underline;">${params.accessUrl}</a>
              </p>

              <!-- Security Warning Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 16px;">
                <tr>
                  <td>
                    <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:4px;">
                      ⚠️ AVERTISSEMENT DE CONFIDENTIALITÉ & TRAÇABILITÉ
                    </div>
                    <div style="font-size:12px;color:#78350f;line-height:1.5;">
                      Cet espace est protégé par un journal d'audit cryptographique. Toute consultation, tentative d'export ou lecture est horodatée et attribuée à votre adresse e-mail (<strong>${params.toEmail}</strong>). Ce lien est nominatif et ne doit pas être transféré.
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding:24px 36px;background-color:#f1f5f9;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">
                Plateforme BUP (Business Up) • Virtual Data Room
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
                Chiffrement au repos et en transit AES-256 • Registre d'audit inviolable • Conformité Due Diligence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envoie un email d'invitation à une Data Room via EmailJS.
 */
export async function sendRoomInvitation(params: RoomInvitationParams): Promise<EmailResult> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim();
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim();

  if (!serviceId || !templateId || !publicKey) {
    console.warn("[EmailJS] Variables non configurées dans .env");
    return {
      success: false,
      notConfigured: true,
      message: "Identifiants EmailJS manquants dans le fichier .env.",
    };
  }

  const htmlContent = generateInvitationHtml(params);

  const templateParams: Record<string, string> = {
    to_email: params.toEmail,
    to_name: params.toName || params.organization || params.toEmail.split("@")[0],
    organization: params.organization || "Partenaire",
    room_name: params.roomName,
    room_purpose: params.roomPurpose,
    role_name: params.roleName,
    download_permission: params.canDownload ? "Téléchargement autorisé" : "Consultation sous scellé uniquement",
    inviter_name: params.inviterName || params.inviterEmail || "L'administrateur de la salle",
    inviter_email: params.inviterEmail || "",
    access_url: params.accessUrl,
    message_html: htmlContent,
    html_content: htmlContent,
    content_html: htmlContent,
    date: new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  try {
    const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    return {
      success: response.status === 200,
      message: "Email d'invitation transmis avec succès.",
    };
  } catch (error: any) {
    console.error("[EmailJS] Erreur d'envoi:", error);
    return {
      success: false,
      message: error?.text || error?.message || "Échec de l'envoi de l'e-mail.",
    };
  }
}
