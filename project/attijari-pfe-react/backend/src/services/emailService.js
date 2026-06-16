import net from 'node:net';
import tls from 'node:tls';

function readSmtpConfig(config = {}) {
  return {
    host: String(config.host ?? process.env.SMTP_HOST ?? '').trim(),
    port: Number(config.port || process.env.SMTP_PORT || 587),
    secure:
      config.secure === true ||
      String(config.secure ?? process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
    user: String(config.user ?? process.env.SMTP_USER ?? '').trim(),
    pass: String(config.pass ?? process.env.SMTP_PASS ?? ''),
    from: String(config.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '').trim(),
  };
}

function encodeBase64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function escapeHeader(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPlatformUrl() {
  return String(
    process.env.APP_BASE_URL ??
      process.env.FRONTEND_URL ??
      process.env.VITE_APP_BASE_URL ??
      'http://localhost:5173',
  ).trim();
}

function buildRawMessage({ from, to, subject, body, html }) {
  if (html) {
    const boundary = `attijari-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return [
      `From: ${escapeHeader(from)}`,
      `To: ${escapeHeader(to)}`,
      `Subject: ${escapeHeader(subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html,
      '',
      `--${boundary}--`,
    ].join('\r\n');
  }

  return [
    `From: ${escapeHeader(from)}`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${escapeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n');
}

function buildAccessApprovedBody({ fullName, email, spaceLabel, temporaryPassword }) {
  const platformUrl = getPlatformUrl();

  return [
    `Bonjour ${fullName},`,
    '',
    "Votre acces a la plateforme Attijari Decision Hub a ete approuve.",
    '',
    'Voici vos identifiants temporaires :',
    `- Espace : ${spaceLabel}`,
    `- Adresse e-mail : ${email}`,
    `- Mot de passe temporaire : ${temporaryPassword}`,
    '',
    'Pour des raisons de securite, merci de vous connecter puis de modifier ce mot de passe des votre premiere session.',
    '',
    `Lien de connexion : ${platformUrl}`,
    '',
    "Si vous n'etes pas a l'origine de cette demande, ignorez ce message et contactez l'administrateur.",
    '',
    'Cordialement,',
    'Equipe Attijari Decision Hub',
  ].join('\n');
}

function buildAccessApprovedHtml({ fullName, email, spaceLabel, temporaryPassword }) {
  const platformUrl = getPlatformUrl();
  const safeFullName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeSpaceLabel = escapeHtml(spaceLabel);
  const safeTemporaryPassword = escapeHtml(temporaryPassword);
  const safePlatformUrl = escapeHtml(platformUrl);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vos acces Attijari Decision Hub</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;margin:0;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:94%;background:#ffffff;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:36px 44px 22px;text-align:center;border-bottom:1px solid #eef0f3;">
                <div style="font-size:30px;font-weight:800;letter-spacing:.02em;color:#c8102e;">Attijari Decision Hub</div>
                <div style="margin-top:10px;font-size:14px;font-weight:700;color:#334155;">Plateforme BI &amp; pilotage decisionnel</div>
              </td>
            </tr>
            <tr>
              <td style="padding:38px 44px 16px;font-size:16px;line-height:1.75;color:#1f2937;">
                <p style="margin:0 0 22px;">Cher(e) <strong>${safeFullName}</strong>,</p>
                <p style="margin:0 0 20px;">Nous avons le plaisir de vous informer que votre demande de creation de compte a ete approuvee par l'equipe administrative.</p>
                <p style="margin:0 0 26px;">Votre espace au sein de la plateforme est <strong>${safeSpaceLabel}</strong>. Cet espace vous donne acces aux fonctionnalites autorisees pour votre direction.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;background:#f1f5f9;border-left:4px solid #c8102e;">
                  <tr>
                    <td style="padding:20px 22px;color:#111827;">
                      <div style="font-size:17px;font-weight:800;margin-bottom:12px;">Informations d'acces</div>
                      <div style="font-size:15px;line-height:1.8;"><strong>Adresse e-mail :</strong> ${safeEmail}</div>
                      <div style="font-size:15px;line-height:1.8;"><strong>Espace :</strong> ${safeSpaceLabel}</div>
                      <div style="font-size:15px;line-height:1.8;"><strong>Mot de passe temporaire :</strong> <span style="font-family:Consolas,Monaco,monospace;font-weight:800;color:#c8102e;">${safeTemporaryPassword}</span></div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 20px;">Pour des raisons de securite, nous vous recommandons de modifier votre mot de passe apres votre premiere connexion.</p>
                <p style="margin:0 0 24px;">Vous pouvez maintenant acceder a la plateforme en cliquant sur le bouton ci-dessous :</p>
                <p style="margin:0 0 32px;">
                  <a href="${safePlatformUrl}" style="display:inline-block;background:#c8102e;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 24px;border-radius:4px;">Acceder a la plateforme</a>
                </p>
                <p style="margin:0 0 20px;">Si vous rencontrez des difficultes pour vous connecter, contactez l'administrateur de la plateforme.</p>
                <p style="margin:0;">Nous vous remercions pour votre confiance et vous souhaitons la bienvenue au sein d'Attijari Decision Hub.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 44px 34px;color:#64748b;font-size:12px;line-height:1.6;border-top:1px solid #eef0f3;">
                Cet e-mail est envoye automatiquement. Merci de ne pas y repondre directement.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildDailyReportBody({ fullName, dateLabel, title, metrics }) {
  return [
    `Bonjour ${fullName},`,
    '',
    `${title} - ${dateLabel}`,
    '',
    ...metrics.map((item) => `- ${item.label} : ${item.value}`),
    '',
    `Consulter les details : ${getPlatformUrl()}`,
    '',
    'Cordialement,',
    'Equipe Attijari Decision Hub',
  ].join('\n');
}

function buildDailyReportHtml({ fullName, dateLabel, title, metrics }) {
  const platformUrl = escapeHtml(getPlatformUrl());
  const metricRows = metrics
    .map(
      (item) => `
        <tr>
          <td style="padding:13px 16px;border-bottom:1px solid #e5e7eb;color:#475569;">${escapeHtml(item.label)}</td>
          <td style="padding:13px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;color:#111827;">${escapeHtml(item.value)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;background:#f4f6f8;">
      <tr><td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:94%;background:#ffffff;border:1px solid #e5e7eb;">
          <tr><td style="padding:30px 40px;text-align:center;border-bottom:4px solid #c8102e;">
            <div style="font-size:27px;font-weight:800;color:#c8102e;">Attijari Decision Hub</div>
            <div style="margin-top:8px;font-size:14px;font-weight:700;color:#475569;">Rapport decisionnel quotidien</div>
          </td></tr>
          <tr><td style="padding:32px 40px 18px;font-size:15px;line-height:1.7;color:#334155;">
            <p style="margin:0 0 18px;">Bonjour <strong>${escapeHtml(fullName)}</strong>,</p>
            <p style="margin:0 0 22px;">Voici votre synthese du <strong>${escapeHtml(dateLabel)}</strong>. Les indicateurs sont lus directement depuis SQL Server.</p>
            <h2 style="margin:0 0 14px;font-size:19px;color:#111827;">${escapeHtml(title)}</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:26px;background:#f8fafc;border:1px solid #e5e7eb;">${metricRows}</table>
            <a href="${platformUrl}" style="display:inline-block;padding:13px 20px;background:#c8102e;color:#ffffff;text-decoration:none;font-weight:800;border-radius:4px;">Ouvrir la plateforme</a>
          </td></tr>
          <tr><td style="padding:18px 40px 28px;color:#64748b;font-size:12px;">Cet e-mail est genere automatiquement. Les details restent disponibles dans la plateforme.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function createLineReader(socket) {
  let buffer = '';
  const waiters = [];

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    flush();
  });

  socket.on('error', (error) => {
    while (waiters.length > 0) {
      waiters.shift().reject(error);
    }
  });

  function flush() {
    while (waiters.length > 0) {
      const match = buffer.match(/(?:^|\r\n)(\d{3})[ -].*\r\n(?!\d{3}-)/s);
      if (!match) return;

      const endIndex = match.index + match[0].length;
      const response = buffer.slice(0, endIndex);
      buffer = buffer.slice(endIndex);
      waiters.shift().resolve(response);
    }
  }

  return {
    read() {
      return new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
        flush();
      });
    },
  };
}

function assertSmtpOk(response, expectedCodes) {
  const code = Number(String(response).slice(0, 3));
  if (!expectedCodes.includes(code)) {
    throw new Error(`Erreur SMTP ${code}: ${String(response).trim()}`);
  }
}

async function sendCommand(socket, reader, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  const response = await reader.read();
  assertSmtpOk(response, expectedCodes);
  return response;
}

async function connectSmtp(config) {
  const socket = config.secure
    ? tls.connect(config.port, config.host, { servername: config.host })
    : net.connect(config.port, config.host);

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });

  const reader = createLineReader(socket);
  assertSmtpOk(await reader.read(), [220]);
  return { socket, reader };
}

async function sendSmtpMail(config, payload) {
  let { socket, reader } = await connectSmtp(config);

  await sendCommand(socket, reader, `EHLO ${config.host}`, [250]);

  if (!config.secure) {
    await sendCommand(socket, reader, 'STARTTLS', [220]);
    socket = tls.connect({ socket, servername: config.host });
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    reader = createLineReader(socket);
    await sendCommand(socket, reader, `EHLO ${config.host}`, [250]);
  }

  await sendCommand(socket, reader, 'AUTH LOGIN', [334]);
  await sendCommand(socket, reader, encodeBase64(config.user), [334]);
  await sendCommand(socket, reader, encodeBase64(config.pass), [235]);
  await sendCommand(socket, reader, `MAIL FROM:<${config.from}>`, [250]);
  await sendCommand(socket, reader, `RCPT TO:<${payload.to}>`, [250, 251]);
  await sendCommand(socket, reader, 'DATA', [354]);
  socket.write(`${buildRawMessage({ ...payload, from: config.from })}\r\n.\r\n`);
  assertSmtpOk(await reader.read(), [250]);
  await sendCommand(socket, reader, 'QUIT', [221]);
  socket.end();
}

export class EmailService {
  constructor({ logger, config }) {
    this.logger = logger;
    this.config = readSmtpConfig(config);
  }

  isConfigured() {
    return Boolean(
      this.config.host &&
        this.config.port &&
        this.config.user &&
        this.config.pass &&
        this.config.from,
    );
  }

  async sendMail(payload) {
    if (!this.isConfigured()) {
      this.logger?.info?.('Email de demonstration genere.', payload);
      return {
        mode: 'demo-log',
        delivered: false,
        preview: payload,
      };
    }

    try {
      await sendSmtpMail(this.config, payload);
      this.logger?.info?.('Email envoye.', {
        to: payload.to,
        subject: payload.subject,
      });

      return {
        mode: 'smtp',
        delivered: true,
      };
    } catch (error) {
      this.logger?.error?.('Echec envoi email SMTP.', {
        to: payload.to,
        subject: payload.subject,
        message: error?.message,
      });

      return {
        mode: 'smtp-error',
        delivered: false,
        preview: payload,
        error: error?.message,
      };
    }
  }

  async sendAccessApprovedEmail({
    fullName,
    email,
    spaceLabel,
    temporaryPassword,
  }) {
    const payload = {
      to: email,
      subject: 'Vos acces Attijari Decision Hub',
      body: buildAccessApprovedBody({ fullName, email, spaceLabel, temporaryPassword }),
      html: buildAccessApprovedHtml({ fullName, email, spaceLabel, temporaryPassword }),
    };

    return this.sendMail(payload);
  }

  async sendPasswordResetEmail({ fullName, email, temporaryPassword }) {
    const payload = {
      to: email,
      subject: 'Reinitialisation de votre mot de passe Attijari Decision Hub',
      body: [
        `Bonjour ${fullName},`,
        '',
        'Votre demande de reinitialisation de mot de passe a ete traitee.',
        '',
        `Email : ${email}`,
        `Mot de passe temporaire : ${temporaryPassword}`,
        '',
        'Veuillez vous connecter puis modifier votre mot de passe.',
        '',
        'Cordialement,',
        'Administrateur Attijari Decision Hub',
      ].join('\n'),
    };

    return this.sendMail(payload);
  }

  async sendDailyReportEmail({ fullName, email, dateLabel, title, metrics }) {
    return this.sendMail({
      to: email,
      subject: `Votre rapport quotidien Attijari Decision Hub - ${dateLabel}`,
      body: buildDailyReportBody({ fullName, dateLabel, title, metrics }),
      html: buildDailyReportHtml({ fullName, dateLabel, title, metrics }),
    });
  }
}
