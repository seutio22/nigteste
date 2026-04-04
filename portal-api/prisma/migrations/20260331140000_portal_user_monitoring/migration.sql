-- Monitoramento de utilizadores do portal (login, atividade, troca de senha)
ALTER TABLE "PortalUser" ADD COLUMN "lastLogin" TIMESTAMP(3);
ALTER TABLE "PortalUser" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "PortalUser" ADD COLUMN "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
