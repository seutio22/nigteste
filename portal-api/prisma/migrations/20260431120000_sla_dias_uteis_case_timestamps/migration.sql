-- SLA: dias úteis no perfil + timestamps no chamado

ALTER TABLE "PortalSlaProfile" ADD COLUMN "prazoEmDiasUteis" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PortalSlaProfile" ADD COLUMN "triagemDiasUteis" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PortalSlaProfile" ADD COLUMN "atuacaoDiasUteis" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "PortalSlaProfile" ADD COLUMN "adicionalDiasUteisAposRetorno" INTEGER NOT NULL DEFAULT 0;

UPDATE "PortalSlaProfile" SET
  "triagemDiasUteis" = GREATEST(1, CEIL("slaTriagemMinutos"::float / 480.0)::int),
  "atuacaoDiasUteis" = GREATEST(1, CEIL("slaAtuacaoMinutos"::float / 480.0)::int),
  "adicionalDiasUteisAposRetorno" = GREATEST(0, CEIL("minutosAdicionalAposRetornoDemanda"::float / 480.0)::int);

ALTER TABLE "PortalCase" ADD COLUMN "slaSubmittedAt" TIMESTAMP(3);
ALTER TABLE "PortalCase" ADD COLUMN "slaTriagemDueAt" TIMESTAMP(3);
ALTER TABLE "PortalCase" ADD COLUMN "slaAtuacaoDueAt" TIMESTAMP(3);
ALTER TABLE "PortalCase" ADD COLUMN "slaPausedAt" TIMESTAMP(3);
