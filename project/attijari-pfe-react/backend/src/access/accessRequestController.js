import bcrypt from 'bcryptjs';
import { sendJson, readJsonBody } from '../utils/http.js';
import { accessRequestStore } from './accessRequestStore.js';
import { sqlUserStore } from '../auth/sqlUserStore.js';
import { generateTemporaryPassword, splitFullName } from '../utils/passwords.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_REQUEST_ROLES = new Set(['MARKETING', 'COMMERCIAL']);

function normalizeRequestedRole(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return ALLOWED_REQUEST_ROLES.has(normalized) ? normalized : '';
}

function getRequestedRoleLabel(role) {
  return role === 'MARKETING' ? 'Direction Marketing' : 'Direction Marche';
}

async function findUserByEmailIncludingInactive(email) {
  if (!sqlUserStore.isConfigured()) {
    return null;
  }

  return sqlUserStore.findByEmailIncludingInactive(email);
}

export const accessRequestController = {
  async handleCreateRequest(request, response, { requestId }) {
    try {
      if (!accessRequestStore.isConfigured()) {
        return sendJson(response, 503, {
          code: 'ACCESS_REQUESTS_UNAVAILABLE',
          message: "Le service de demandes d'acces SQL n'est pas disponible.",
          requestId,
        });
      }

      const { fullName, email, requestedRole, message } = await readJsonBody(request);
      const normalizedFullName = String(fullName ?? '')
        .trim()
        .replace(/\s+/g, ' ');
      const normalizedEmail = String(email ?? '')
        .trim()
        .toLowerCase();
      const normalizedRole = normalizeRequestedRole(requestedRole);
      const normalizedMessage = String(message ?? '')
        .trim()
        .slice(0, 1000);

      if (!normalizedFullName || !normalizedEmail || !normalizedRole) {
        return sendJson(response, 400, {
          code: 'MISSING_FIELDS',
          message:
            "Nom complet, email professionnel et direction demandee sont obligatoires.",
        });
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return sendJson(response, 400, {
          code: 'INVALID_EMAIL',
          message: 'Adresse e-mail invalide.',
        });
      }

      const existingUser = await findUserByEmailIncludingInactive(normalizedEmail);
      if (existingUser) {
        return sendJson(response, 409, {
          code: 'EMAIL_ALREADY_GRANTED',
          message: 'Un compte existe deja pour cette adresse e-mail.',
        });
      }

      const pendingRequest = await accessRequestStore.findPendingByEmail(normalizedEmail);
      if (pendingRequest) {
        return sendJson(response, 409, {
          code: 'REQUEST_ALREADY_PENDING',
          message: "Une demande d'acces est deja en attente pour cette adresse e-mail.",
        });
      }

      const createdRequest = await accessRequestStore.createRequest({
        fullName: normalizedFullName,
        email: normalizedEmail,
        requestedRole: normalizedRole,
        message: normalizedMessage,
      });

      return sendJson(response, 201, {
        message: "Votre demande d'acces a ete envoyee a l'administrateur.",
        request: createdRequest,
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'ACCESS_REQUEST_CREATE_ERROR',
        message: error.message ?? "Erreur lors de l'envoi de la demande d'acces.",
        requestId,
      });
    }
  },

  async handleListRequests(_request, response, { requestId }) {
    try {
      const requests = await accessRequestStore.listRequests();
      return sendJson(response, 200, { requests });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'ACCESS_REQUESTS_READ_ERROR',
        message: error.message ?? "Erreur lors de la lecture des demandes d'acces.",
        requestId,
      });
    }
  },

  async handleApproveRequest(request, response, { requestId, emailService }) {
    try {
      if (!emailService?.isConfigured?.()) {
        return sendJson(response, 503, {
          code: 'SMTP_NOT_CONFIGURED',
          message:
            "Configurez SMTP avant d'approuver une demande : les identifiants doivent etre envoyes par e-mail et ne sont pas affiches a l'administrateur.",
          requestId,
        });
      }

      const currentUser = request.user;
      const targetRequest = await accessRequestStore.findById(request.params.requestId);

      if (!targetRequest) {
        return sendJson(response, 404, {
          code: 'REQUEST_NOT_FOUND',
          message: "Demande d'acces introuvable.",
        });
      }

      if (targetRequest.status !== 'EN_ATTENTE') {
        return sendJson(response, 409, {
          code: 'REQUEST_ALREADY_REVIEWED',
          message: 'Cette demande a deja ete traitee.',
        });
      }

      const existingUser = await findUserByEmailIncludingInactive(targetRequest.email);
      if (existingUser) {
        return sendJson(response, 409, {
          code: 'EMAIL_ALREADY_GRANTED',
          message: 'Un compte existe deja pour cette adresse e-mail.',
        });
      }

      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      const nameParts = splitFullName(targetRequest.fullName);

      const approvedRequest = await accessRequestStore.approveRequest({
        requestId: targetRequest.id,
        reviewerId: currentUser.id,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        initials: nameParts.initials,
        email: targetRequest.email,
        passwordHash,
        role: targetRequest.requestedRole,
      });

      const emailResult = await emailService.sendAccessApprovedEmail({
        fullName: targetRequest.fullName,
        email: targetRequest.email,
        spaceLabel: getRequestedRoleLabel(targetRequest.requestedRole),
        temporaryPassword,
      });

      return sendJson(response, 200, {
        message: emailResult.delivered
          ? "La demande d'acces a ete approuvee et les identifiants ont ete envoyes par e-mail."
          : "La demande d'acces a ete approuvee, mais l'e-mail d'identifiants n'a pas pu etre envoye.",
        request: approvedRequest,
        emailDelivery: {
          fullName: targetRequest.fullName,
          email: targetRequest.email,
          role: targetRequest.requestedRole,
          spaceLabel: getRequestedRoleLabel(targetRequest.requestedRole),
          mode: emailResult.mode,
          delivered: emailResult.delivered,
          error: emailResult.error,
        },
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'ACCESS_REQUEST_APPROVE_ERROR',
        message: error.message ?? "Erreur lors de l'approbation de la demande.",
        requestId,
      });
    }
  },

  async handleRejectRequest(request, response, { requestId }) {
    try {
      const currentUser = request.user;
      const targetRequest = await accessRequestStore.findById(request.params.requestId);

      if (!targetRequest) {
        return sendJson(response, 404, {
          code: 'REQUEST_NOT_FOUND',
          message: "Demande d'acces introuvable.",
        });
      }

      if (targetRequest.status !== 'EN_ATTENTE') {
        return sendJson(response, 409, {
          code: 'REQUEST_ALREADY_REVIEWED',
          message: 'Cette demande a deja ete traitee.',
        });
      }

      const { reviewComment } = await readJsonBody(request);
      const rejectedRequest = await accessRequestStore.rejectRequest({
        requestId: targetRequest.id,
        reviewerId: currentUser.id,
        reviewComment: String(reviewComment ?? '')
          .trim()
          .slice(0, 500),
      });

      return sendJson(response, 200, {
        message: "La demande d'acces a ete refusee.",
        request: rejectedRequest,
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'ACCESS_REQUEST_REJECT_ERROR',
        message: error.message ?? 'Erreur lors du refus de la demande.',
        requestId,
      });
    }
  },
};
