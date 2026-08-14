import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Rotas do módulo Placement.
 *
 * - Dados > Placement: cadastro de Filiais (`/placement/filiais`).
 * - Módulo operacional Placement: Fila de cotações (`/placement/cotacoes`).
 */
function onlyDigits(value: string): string {
  return (value || '').replace(/\D+/g, '');
}

/** CNAE: 7 dígitos (classe) ou 8 (subclasse). Apenas dígitos. */
function normalizeCnae(value: unknown): string {
  const d = onlyDigits(String(value ?? ''));
  if (d.length === 7 || d.length === 8) return d;
  return '';
}

function isValidCnaeDigits(d: string): boolean {
  return d.length === 7 || d.length === 8;
}

function normalizeStatus(value: unknown): 'Ativo' | 'Inativo' {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'inativo' || v === 'inactive' || v === '0' || v === 'false') return 'Inativo';
  return 'Ativo';
}

const PLACEMENT_STATUS_RASCUNHO = 'Rascunho';

const COTACAO_WORKFLOW_STATUSES = [
  'Aberta',
  'Validação',
  'Kick off',
  'Estratégia',
  'Em cotação',
  'Aguardando operadora',
  'Consolidando dados',
  'Validação proposta',
  'Proposta enviada',
  'Fechada',
  'Perdida',
  'Cancelada',
] as const;

const COTACAO_STATUSES = [PLACEMENT_STATUS_RASCUNHO, ...COTACAO_WORKFLOW_STATUSES] as const;

type CotacaoStatus = (typeof COTACAO_STATUSES)[number];

function isRascunhoStatusApi(status: string | null | undefined): boolean {
  return String(status ?? '').trim().toLowerCase() === PLACEMENT_STATUS_RASCUNHO.toLowerCase();
}

function normalizeCotacaoStatus(value: unknown): CotacaoStatus {
  const v = String(value ?? '').trim();
  const hit = COTACAO_STATUSES.find((s) => s.toLowerCase() === v.toLowerCase());
  return hit ?? 'Aberta';
}

/** Em PUT de status: rejeita valor desconhecido em vez de cair silenciosamente em «Aberta». */
function resolveCotacaoStatusUpdate(value: unknown): CotacaoStatus | null {
  const v = String(value ?? '').trim();
  if (!v) return null;
  const hit = COTACAO_STATUSES.find((s) => s.toLowerCase() === v.toLowerCase());
  return hit ?? null;
}

/** ID opcional (string não vazia) ou null quando enviado vazio. */
function parseOptionalId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

/** Gera um ticket sequencial no formato COT-YYYYMM-NNNN para a Fila Placement. */
async function generateCotacaoTicket(prisma: PrismaClient): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `COT-${yyyymm}-`;
  const last = await prisma.placementCotacao.findFirst({
    where: { ticket: { startsWith: prefix } },
    orderBy: { ticket: 'desc' },
    select: { ticket: true },
  });
  const lastSeq = last?.ticket?.split('-').pop() ?? '0000';
  const nextSeq = Number(lastSeq) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

function normalizeTwoDigitYear(yy: number): number {
  const y2000 = 2000 + yy
  const y1900 = 1900 + yy
  const todayYear = new Date().getFullYear()
  const ok2000 = todayYear - y2000 >= 0 && todayYear - y2000 < 120
  const ok1900 = todayYear - y1900 >= 0 && todayYear - y1900 < 120
  if (ok2000 && ok1900) return yy <= 29 ? y2000 : y1900
  if (ok2000) return y2000
  if (ok1900) return y1900
  return yy <= 29 ? y2000 : y1900
}

function toDateOrNull(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) && value >= 1900 && value <= 2035) {
      return new Date(`${value}-07-01T12:00:00.000Z`);
    }
    const utc = (value - 25569) * 86400 * 1000;
    const d = new Date(utc);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim().replace(/\s+/g, '');
  if (/^\d{4}$/.test(s)) {
    const d = new Date(`${s}-07-01T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
  if (br) {
    const p1 = Number(br[1]);
    const p2 = Number(br[2]);
    const yyRaw = br[3];
    let yyyy: number;
    if (yyRaw.length === 4) yyyy = Number(yyRaw);
    else if (yyRaw.length === 2) yyyy = normalizeTwoDigitYear(Number(yyRaw));
    else yyyy = normalizeTwoDigitYear(Number(yyRaw.padStart(2, '0')));
    let day: number;
    let month: number;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      day = p1;
      month = p2;
    }
    const d = new Date(`${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIntOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function strFieldOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

const EM_COTACAO_SUBETAPAS = [
  'beneficiarios',
  'analise_base',
  'etapa2',
  'etapa3',
  'etapa4',
  'comunicar_mercado',
] as const;
const MAX_BENEFICIARIOS_POR_COTACAO = 25_000;
/** Evita estourar o limite de parâmetros do PostgreSQL em createMany. */
const BENEFICIARIOS_INSERT_BATCH_SIZE = 400;

type BeneficiarioRowParsed = ReturnType<typeof parseBeneficiarioRowInput>;

function prismaErrorDetail(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message : undefined;
  }
  const e = error as { code?: string; message?: string };
  if (e.code === 'P2021') {
    return 'Tabela de beneficiários não encontrada no banco. Verifique se as migrations foram aplicadas no servidor.';
  }
  if (e.code === 'P2028') {
    return 'Importação demorou mais que o limite da transação. Tente novamente; se persistir, reduza o tamanho da planilha.';
  }
  return e.message;
}

async function insertBeneficiariosBatched(
  db: Pick<PrismaClient, 'placementCotacaoBeneficiario'>,
  cotacaoId: string,
  rows: BeneficiarioRowParsed[]
) {
  for (let i = 0; i < rows.length; i += BENEFICIARIOS_INSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + BENEFICIARIOS_INSERT_BATCH_SIZE);
    await db.placementCotacaoBeneficiario.createMany({
      data: chunk.map((p) => ({
        id: randomUUID(),
        ...p,
        cotacaoId,
      })),
    });
  }
}

function normalizeEmCotacaoSubetapa(value: unknown): string {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'localidade' || v === 'etapa2' || v === 'etapa3' || v === 'etapa4') return 'analise_base';
  const hit = EM_COTACAO_SUBETAPAS.find((s) => s === v);
  return hit ?? 'beneficiarios';
}

function parseBeneficiarioRowInput(row: Record<string, unknown>) {
  return {
    ordem: toIntOrNull(row.ordem) ?? null,
    empresa: strFieldOrNull(row.empresa),
    sub: strFieldOrNull(row.sub),
    cnpj: strFieldOrNull(row.cnpj),
    matricula: strFieldOrNull(row.matricula),
    sexo: strFieldOrNull(row.sexo),
    nome: strFieldOrNull(row.nome),
    dataNascimento: toDateOrNull(row.dataNascimento) ?? null,
    grauParentesco: strFieldOrNull(row.grauParentesco),
    statusBeneficiario: strFieldOrNull(row.statusBeneficiario),
    cid10: strFieldOrNull(row.cid10),
    motivoAfastamento: strFieldOrNull(row.motivoAfastamento),
    dataInicioBeneficio: toDateOrNull(row.dataInicioBeneficio) ?? null,
    dataFinalBeneficio: toDateOrNull(row.dataFinalBeneficio) ?? null,
    cargo: strFieldOrNull(row.cargo),
    cidade: strFieldOrNull(row.cidade),
    uf: strFieldOrNull(row.uf),
    operadora: strFieldOrNull(row.operadora),
    planoAtual: strFieldOrNull(row.planoAtual),
    acomodacao: strFieldOrNull(row.acomodacao),
    custoPerCapita: strFieldOrNull(row.custoPerCapita),
  };
}

function toOperadorasArray(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  return value
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length > 0);
}

type ItemMapeamentoInput = {
  id?: string;
  produtoId: string;
  produtoNome: string;
  categoria?: string;
  fornecedorId: string;
};

function parseItensMapeamentoBody(value: unknown): ItemMapeamentoInput[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return null;
  const out: ItemMapeamentoInput[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: r.id != null ? String(r.id) : undefined,
      produtoId: r.produtoId != null ? String(r.produtoId) : '',
      produtoNome: r.produtoNome != null ? String(r.produtoNome).trim() : '',
      categoria: r.categoria != null ? String(r.categoria).trim() : undefined,
      fornecedorId: r.fornecedorId != null ? String(r.fornecedorId) : '',
    });
  }
  return out;
}

function parsePermiteUpgradeDowngrade(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const v = String(value).toLowerCase();
  if (v === 'true' || v === 'sim' || v === 'yes' || v === '1') return true;
  if (v === 'false' || v === 'nao' || v === 'não' || v === 'no' || v === '0') return false;
  return null;
}

function parseFormularioTipo(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const v = String(value).trim().toLowerCase();
  if (
    v === 'saude' ||
    v === 'odontologico' ||
    v === 'vida_em_grupo' ||
    v === 'nao_seguraveis'
  ) {
    return v;
  }
  return null;
}

function parsePlanosCoberturaBody(value: unknown): unknown[] | Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as { planos?: unknown }).planos)) {
    return value as Record<string, unknown>;
  }
  return null;
}

type KickOffEstrategiaItem = { id: string; rotulo: string; valor: string };
type KickOffEstrategiaSecao = { id: string; titulo: string; itens: KickOffEstrategiaItem[] };
type KickOffEstrategiaPayload = {
  secoes: KickOffEstrategiaSecao[];
  mercadoAnalisado: string[];
  notas?: string | null;
  resumoEdicoes?: Record<string, string> | null;
  comunicarMercado?: unknown;
  aguardandoOperadora?: unknown;
  consolidandoDados?: unknown;
  validacaoProposta?: unknown;
};

function newKickOffItemId(): string {
  return `ki-${randomUUID().slice(0, 8)}`;
}

function parseKickOffEstrategiaBody(value: unknown): KickOffEstrategiaPayload | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const secoesRaw = Array.isArray(raw.secoes) ? raw.secoes : [];
  const secoes: KickOffEstrategiaSecao[] = secoesRaw
    .map((sec) => {
      if (!sec || typeof sec !== 'object' || Array.isArray(sec)) return null;
      const s = sec as Record<string, unknown>;
      const itensRaw = Array.isArray(s.itens) ? s.itens : [];
      const itens: KickOffEstrategiaItem[] = itensRaw
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const i = item as Record<string, unknown>;
          const id = String(i.id ?? '').trim() || newKickOffItemId();
          return {
            id,
            rotulo: String(i.rotulo ?? '').trim(),
            valor: String(i.valor ?? '').trim(),
          };
        })
        .filter(Boolean) as KickOffEstrategiaItem[];
      const id = String(s.id ?? '').trim() || newKickOffItemId();
      return {
        id,
        titulo: String(s.titulo ?? '').trim(),
        itens,
      };
    })
    .filter(Boolean) as KickOffEstrategiaSecao[];
  const mercadoAnalisado = Array.isArray(raw.mercadoAnalisado)
    ? raw.mercadoAnalisado.map((m) => String(m ?? '').trim()).filter(Boolean)
    : [];
  const notas =
    raw.notas === undefined || raw.notas === null
      ? null
      : String(raw.notas ?? '').trim() || null;

  const resumoEdicoesRaw = raw.resumoEdicoes;
  const resumoEdicoes =
    resumoEdicoesRaw &&
    typeof resumoEdicoesRaw === 'object' &&
    !Array.isArray(resumoEdicoesRaw)
      ? Object.fromEntries(
          Object.entries(resumoEdicoesRaw as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v ?? ''),
          ])
        )
      : undefined;

  const extra: Pick<
    KickOffEstrategiaPayload,
    | 'resumoEdicoes'
    | 'comunicarMercado'
    | 'aguardandoOperadora'
    | 'consolidandoDados'
    | 'validacaoProposta'
  > = {};
  if (resumoEdicoes && Object.keys(resumoEdicoes).length) extra.resumoEdicoes = resumoEdicoes;
  if (raw.comunicarMercado && typeof raw.comunicarMercado === 'object' && !Array.isArray(raw.comunicarMercado)) {
    extra.comunicarMercado = raw.comunicarMercado;
  }
  if (
    raw.aguardandoOperadora &&
    typeof raw.aguardandoOperadora === 'object' &&
    !Array.isArray(raw.aguardandoOperadora)
  ) {
    extra.aguardandoOperadora = raw.aguardandoOperadora;
  }
  if (
    raw.consolidandoDados &&
    typeof raw.consolidandoDados === 'object' &&
    !Array.isArray(raw.consolidandoDados)
  ) {
    extra.consolidandoDados = raw.consolidandoDados;
  }
  if (
    raw.validacaoProposta &&
    typeof raw.validacaoProposta === 'object' &&
    !Array.isArray(raw.validacaoProposta)
  ) {
    extra.validacaoProposta = raw.validacaoProposta;
  }

  return { secoes, mercadoAnalisado, notas, ...extra };
}

/** Mescla kick off parcial do PATCH com o JSON já persistido (evita apagar comunicarMercado / seções). */
function mergeKickOffEstrategiaPayload(
  existingRaw: unknown,
  incoming: KickOffEstrategiaPayload | null | undefined
): KickOffEstrategiaPayload | null | undefined {
  if (incoming === undefined) return undefined;
  if (incoming === null) return null;
  const existing = parseKickOffEstrategiaBody(existingRaw);
  if (!existing) return incoming;

  const merged: KickOffEstrategiaPayload = {
    secoes: incoming.secoes.length > 0 ? incoming.secoes : existing.secoes,
    mercadoAnalisado:
      incoming.mercadoAnalisado.length > 0 ? incoming.mercadoAnalisado : existing.mercadoAnalisado,
    notas: incoming.notas !== undefined && incoming.notas !== null ? incoming.notas : existing.notas,
  };

  const resumoEdicoes = incoming.resumoEdicoes ?? existing.resumoEdicoes;
  if (resumoEdicoes && Object.keys(resumoEdicoes).length) merged.resumoEdicoes = resumoEdicoes;

  const comunicarMercado = incoming.comunicarMercado ?? existing.comunicarMercado;
  if (comunicarMercado) merged.comunicarMercado = comunicarMercado;

  const aguardandoOperadora = incoming.aguardandoOperadora ?? existing.aguardandoOperadora;
  if (aguardandoOperadora) merged.aguardandoOperadora = aguardandoOperadora;

  // Cliente envia o bloco completo ao autosave; sem isto o PUT apagava diferenciais/condições.
  const consolidandoDados =
    incoming.consolidandoDados !== undefined
      ? incoming.consolidandoDados
      : existing.consolidandoDados;
  if (consolidandoDados !== undefined && consolidandoDados !== null) {
    merged.consolidandoDados = consolidandoDados;
  }

  const validacaoProposta =
    incoming.validacaoProposta !== undefined
      ? incoming.validacaoProposta
      : existing.validacaoProposta;
  if (validacaoProposta !== undefined && validacaoProposta !== null) {
    merged.validacaoProposta = validacaoProposta;
  }

  return merged;
}

function kickOffEstrategiaIsComplete(payload: KickOffEstrategiaPayload | null | undefined): boolean {
  if (!payload) return false;
  const temValor = payload.secoes.some((s) => s.itens.some((i) => i.valor.trim()));
  const temMercado = payload.mercadoAnalisado.length > 0;
  return temValor && temMercado;
}

function normMercadoKeyApi(nome: string): string {
  return nome.trim().toLowerCase();
}

function comunicarMercadoIsCompleteFromKickOff(
  kickOff: KickOffEstrategiaPayload | null | undefined
): boolean {
  if (!kickOff?.mercadoAnalisado?.length) return false;
  const cm = kickOff.comunicarMercado;
  if (!cm || typeof cm !== 'object' || Array.isArray(cm)) return false;
  const fornecedores = (cm as Record<string, unknown>).fornecedores;
  if (!fornecedores || typeof fornecedores !== 'object' || Array.isArray(fornecedores)) {
    return false;
  }
  const map = fornecedores as Record<string, { enviado?: boolean }>;
  return kickOff.mercadoAnalisado.every((nome) => map[normMercadoKeyApi(nome)]?.enviado === true);
}

type WorkflowStatusValidationResult =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

async function validateWorkflowStatusTransition(
  prisma: PrismaClient,
  existing: {
    id: string;
    status: string;
    analistaResponsavelId: string | null;
    kickOffEstrategia: unknown;
    emCotacaoSubetapa: string | null;
  },
  nextStatus: CotacaoStatus
): Promise<WorkflowStatusValidationResult> {
  const curStatus = normalizeCotacaoStatus(existing.status);

  if (curStatus.toLowerCase() === 'validação' && nextStatus.toLowerCase() === 'kick off') {
    if (!existing.analistaResponsavelId) {
      return {
        ok: false,
        status: 400,
        error: 'Analista responsável obrigatório',
        message:
          'Designe o analista responsável (Dados → Placement → Analista) antes de avançar para Kick off.',
      };
    }
    const totalBenef = await prisma.placementCotacaoBeneficiario.count({
      where: { cotacaoId: existing.id },
    });
    if (totalBenef < 1) {
      return {
        ok: false,
        status: 400,
        error: 'Base de beneficiários obrigatória',
        message:
          'Importe a base de beneficiários na Validação antes de avançar para Kick off.',
      };
    }
  }

  if (curStatus.toLowerCase() === 'kick off' && nextStatus.toLowerCase() === 'estratégia') {
    return { ok: true };
  }

  if (curStatus.toLowerCase() === 'estratégia' && nextStatus.toLowerCase() === 'em cotação') {
    const effKick = parseKickOffEstrategiaBody(existing.kickOffEstrategia);
    if (!kickOffEstrategiaIsComplete(effKick)) {
      return {
        ok: false,
        status: 400,
        error: 'Estratégia incompleta',
        message:
          'Preencha a estratégia (itens e mercado analisado) antes de avançar para Solicitação Mercado.',
      };
    }
  }

  if (curStatus.toLowerCase() === 'em cotação' && nextStatus.toLowerCase() === 'aguardando operadora') {
    if (normalizeEmCotacaoSubetapa(existing.emCotacaoSubetapa) !== 'comunicar_mercado') {
      return {
        ok: false,
        status: 400,
        error: 'Subetapa incompleta',
        message:
          'Conclua a subetapa «Comunicar mercado» (última de Solicitação Mercado) antes de avançar para Aguardando operadora.',
      };
    }
    const total = await prisma.placementCotacaoBeneficiario.count({ where: { cotacaoId: existing.id } });
    if (total < 1) {
      return {
        ok: false,
        status: 400,
        error: 'Base de beneficiários obrigatória',
        message:
          'Importe a base de beneficiários (subetapa 1 de Solicitação Mercado) antes de avançar para Aguardando operadora.',
      };
    }
    const effKick = parseKickOffEstrategiaBody(existing.kickOffEstrategia);
    if (!comunicarMercadoIsCompleteFromKickOff(effKick)) {
      return {
        ok: false,
        status: 400,
        error: 'Comunicação incompleta',
        message:
          'Marque todos os fornecedores do mercado analisado como «comunicado ao mercado» antes de avançar.',
      };
    }
  }

  if (
    curStatus.toLowerCase() === 'aguardando operadora' &&
    nextStatus.toLowerCase() === 'consolidando dados'
  ) {
    return { ok: true };
  }

  if (
    curStatus.toLowerCase() === 'consolidando dados' &&
    nextStatus.toLowerCase() === 'validação proposta'
  ) {
    const effKick = parseKickOffEstrategiaBody(existing.kickOffEstrategia);
    const cd = (effKick as {
      consolidandoDados?: {
        condicoesContratuais?: string
        condicoes?: Record<string, Record<string, Array<{ texto?: string }>>>
        diferenciais?: Record<string, Record<string, Array<{ texto?: string }>>>
      }
      validacaoProposta?: { analistaValidadorId?: string }
    })?.consolidandoDados;
    const condicoesLivres = String(cd?.condicoesContratuais ?? '').trim();
    const mapTemTexto = (
      map: Record<string, Record<string, Array<{ texto?: string }>>> | undefined
    ) => {
      if (!map || typeof map !== 'object') return false
      for (const porColuna of Object.values(map)) {
        if (!porColuna || typeof porColuna !== 'object') continue
        for (const celulas of Object.values(porColuna)) {
          if (Array.isArray(celulas) && celulas.some((c) => String(c?.texto ?? '').trim())) {
            return true
          }
        }
      }
      return false
    }
    const temCondicoes = condicoesLivres.length > 0 || mapTemTexto(cd?.condicoes)
    const temDiferenciais = mapTemTexto(cd?.diferenciais)
    if (!temCondicoes || !temDiferenciais) {
      return {
        ok: false,
        status: 400,
        error: 'Consolidação incompleta',
        message:
          'Preencha as condições contratuais e os diferenciais antes de avançar para Validação.',
      };
    }
    const validador = String(
      (effKick as { validacaoProposta?: { analistaValidadorId?: string } })?.validacaoProposta
        ?.analistaValidadorId ?? ''
    ).trim()
    if (!validador) {
      return {
        ok: false,
        status: 400,
        error: 'Analista validador obrigatório',
        message:
          'Designe o analista validador (catálogo Placement) antes de avançar para a etapa Validação.',
      };
    }
    const validadorExiste = await prisma.placementAnalista.findUnique({
      where: { id: validador },
      select: { id: true },
    });
    if (!validadorExiste) {
      return {
        ok: false,
        status: 400,
        error: 'Analista validador inválido',
        message:
          'O analista validador deve existir no catálogo Dados → Placement → Analista.',
      };
    }
    const responsavelId = String(existing.analistaResponsavelId ?? '').trim();
    if (responsavelId && validador === responsavelId) {
      return {
        ok: false,
        status: 400,
        error: 'Analista validador inválido',
        message: 'O validador deve ser diferente do analista responsável.',
      };
    }
  }

  if (
    curStatus.toLowerCase() === 'validação proposta' &&
    nextStatus.toLowerCase() === 'proposta enviada'
  ) {
    const effKick = parseKickOffEstrategiaBody(existing.kickOffEstrategia) as {
      validacaoProposta?: {
        analistaValidadorId?: string
        itens?: Array<{ status?: string; comentario?: string }>
      }
    }
    const vp = effKick?.validacaoProposta
    if (!String(vp?.analistaValidadorId ?? '').trim()) {
      return {
        ok: false,
        status: 400,
        error: 'Analista validador obrigatório',
        message: 'Designe o analista validador antes de enviar a proposta.',
      }
    }
    const itens = Array.isArray(vp?.itens) ? vp!.itens! : []
    if (!itens.length) {
      return {
        ok: false,
        status: 400,
        error: 'Validação incompleta',
        message: 'Avalie os itens consolidados antes de avançar para Proposta enviada.',
      }
    }
    if (itens.some((i) => String(i?.status ?? '') === 'pendente')) {
      return {
        ok: false,
        status: 400,
        error: 'Itens pendentes',
        message: 'Ainda há itens pendentes de avaliação na Validação.',
      }
    }
    if (itens.some((i) => String(i?.status ?? '') === 'ajuste')) {
      return {
        ok: false,
        status: 400,
        error: 'Ajustes pendentes',
        message:
          'Há ajustes registrados. Devolva para Consolidando dados ou resolva os ajustes antes de enviar a proposta.',
      }
    }
  }

  if (
    curStatus.toLowerCase() === 'validação proposta' &&
    nextStatus.toLowerCase() === 'consolidando dados'
  ) {
    const effKick = parseKickOffEstrategiaBody(existing.kickOffEstrategia) as {
      validacaoProposta?: {
        itens?: Array<{ status?: string; comentario?: string }>
      }
    }
    const itens = Array.isArray(effKick?.validacaoProposta?.itens)
      ? effKick!.validacaoProposta!.itens!
      : []
    const ajustes = itens.filter((i) => String(i?.status ?? '') === 'ajuste')
    if (!ajustes.length) {
      return {
        ok: false,
        status: 400,
        error: 'Sem ajustes',
        message:
          'Para devolver a Consolidando dados, marque ao menos um item como ajuste com comentário.',
      }
    }
    if (ajustes.some((a) => !String(a?.comentario ?? '').trim())) {
      return {
        ok: false,
        status: 400,
        error: 'Comentário obrigatório',
        message: 'Todo item marcado como ajuste precisa de um comentário descrevendo a correção.',
      }
    }
  }

  // Bloqueia pular a Validação proposta (legado consolidando → proposta)
  if (
    curStatus.toLowerCase() === 'consolidando dados' &&
    nextStatus.toLowerCase() === 'proposta enviada'
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Etapa obrigatória',
      message:
        'Avance primeiro para a etapa Validação (revisão por outro analista) antes de Proposta enviada.',
    };
  }

  return { ok: true };
}

const cotacaoLightSelect = {
  id: true,
  status: true,
  emCotacaoSubetapa: true,
  updatedAt: true,
  kickOffEstrategia: true,
  vidas: true,
  valorEstimadoCents: true,
} as const;

function deriveRamoFromItens(itens: ItemMapeamentoInput[]): string | null {
  const nomes = [...new Set(itens.map((i) => i.produtoNome).filter(Boolean))];
  return nomes.length ? nomes.join(', ') : null;
}

function deriveOperadorasFromItens(itens: ItemMapeamentoInput[]): string[] | null {
  const ids = [...new Set(itens.map((i) => i.fornecedorId).filter(Boolean))];
  return ids.length ? ids : null;
}

type BrasilCnpjEnrichmentOk = {
  ok: true;
  razaoSocial: string | null;
  cnae: string | null;
  nomeFantasia: string | null;
  cidade: string | null;
  uf: string | null;
};

type BrasilCnpjEnrichmentFail = {
  ok: false;
  notFound: boolean;
};

/** Base URL da API de CNPJ (padrão BrasilAPI pública). Sem barra final. */
function brasilApiCnpjBaseUrl(): string {
  const raw = (process.env.BRASILAPI_CNPJ_BASE_URL || 'https://brasilapi.com.br/api/cnpj/v1').trim();
  return raw.replace(/\/+$/, '');
}

function brasilApiCnpjTimeoutMs(): number {
  const n = Number(process.env.BRASILAPI_CNPJ_TIMEOUT_MS);
  if (Number.isFinite(n) && n >= 3000 && n <= 60000) return Math.round(n);
  return 15000;
}

/** Consulta BrasilAPI (Receita) por CNPJ. */
async function fetchBrasilCnpjEnrichment(
  cnpjDigits: string
): Promise<BrasilCnpjEnrichmentOk | BrasilCnpjEnrichmentFail> {
  if (cnpjDigits.length !== 14) return { ok: false, notFound: false };
  try {
    const url = `${brasilApiCnpjBaseUrl()}/${cnpjDigits}`;
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'demandas-api/placement (CNPJ consulta)',
      },
      signal: AbortSignal.timeout(brasilApiCnpjTimeoutMs()),
    });
    if (r.status === 404) return { ok: false, notFound: true };
    if (!r.ok) return { ok: false, notFound: false };
    const j = (await r.json()) as Record<string, unknown>;
    const razaoSocial = String(j.razao_social ?? '').trim() || null;
    let cnaeRaw = onlyDigits(String(j.cnae_fiscal ?? ''));
    if (cnaeRaw.length > 8) cnaeRaw = cnaeRaw.slice(0, 8);
    const cnae = isValidCnaeDigits(cnaeRaw) ? cnaeRaw : null;
    const nomeFantasia = String(j.nome_fantasia ?? '').trim() || null;
    const cidade = String(j.municipio ?? '').trim() || null;
    const ufRaw = String(j.uf ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    const uf = ufRaw.length === 2 ? ufRaw : null;
    return { ok: true, razaoSocial, cnae, nomeFantasia, cidade, uf };
  } catch {
    return { ok: false, notFound: false };
  }
}

type SubfaturaAnexo = {
  id: string;
  nomeOriginal: string;
  storedName: string;
  mimeType: string;
  size: number;
};

function parseSubfaturaAnexos(value: unknown): SubfaturaAnexo[] {
  if (!Array.isArray(value)) return [];
  const out: SubfaturaAnexo[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = r.id != null ? String(r.id) : '';
    const nomeOriginal = r.nomeOriginal != null ? String(r.nomeOriginal) : '';
    const storedName = r.storedName != null ? String(r.storedName) : '';
    if (!id || !storedName) continue;
    out.push({
      id,
      nomeOriginal,
      storedName,
      mimeType: r.mimeType != null ? String(r.mimeType) : 'application/octet-stream',
      size: typeof r.size === 'number' && Number.isFinite(r.size) ? r.size : 0,
    });
  }
  return out;
}

function subfaturaUploadDir(subfaturaId: string): string {
  const base =
    process.env.PLACEMENT_UPLOADS_DIR?.trim() || path.join(process.cwd(), 'uploads');
  return path.join(base, 'placement-subfatura', subfaturaId);
}

const LOGO_MIME_ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function operadoraLogoUploadDir(operadoraId: string): string {
  const base =
    process.env.PLACEMENT_UPLOADS_DIR?.trim() || path.join(process.cwd(), 'uploads');
  return path.join(base, 'placement-operadora-logo', operadoraId);
}

type OperadoraLogoFileRef = { operadoraId: string; storedName: string };

function operadoraLogoAbsolutePath(row: OperadoraLogoFileRef): string {
  return path.join(operadoraLogoUploadDir(row.operadoraId), row.storedName);
}

async function operadoraLogoFileExists(row: OperadoraLogoFileRef): Promise<boolean> {
  try {
    await fs.access(operadoraLogoAbsolutePath(row));
    return true;
  } catch {
    return false;
  }
}

/** Remove metadado quando o arquivo sumiu (ex.: redeploy Railway sem volume persistente). */
async function purgeOrphanOperadoraLogo(
  prisma: PrismaClient,
  operadoraId: string
): Promise<void> {
  try {
    await prisma.placementOperadoraLogo.delete({ where: { operadoraId } });
  } catch {
    /* registro já removido */
  }
}

async function removeSubfaturaAnexoFiles(subfaturaId: string, anexos: SubfaturaAnexo[]): Promise<void> {
  const base = subfaturaUploadDir(subfaturaId);
  for (const a of anexos) {
    try {
      await fs.unlink(path.join(base, a.storedName));
    } catch {
      /* arquivo já removido ou inexistente */
    }
  }
}

export default async function placementRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  /** Vincula Cliente master pelo CNPJ da condição Placement (14 dígitos). */
  async function resolveClienteIdFromCondicaoCnpj(condicaoId: string): Promise<string | null> {
    const cond = await prisma.placementCondicao.findUnique({
      where: { id: condicaoId },
      select: { cnpj: true },
    });
    if (!cond?.cnpj) return null;
    const digits = onlyDigits(cond.cnpj);
    if (digits.length !== 14) return null;
    const clientes = await prisma.cliente.findMany({
      where: { cnpj: { not: null } },
      select: { id: true, cnpj: true },
    });
    for (const c of clientes) {
      if (c.cnpj && onlyDigits(c.cnpj) === digits) return c.id;
    }
    return null;
  }

  await fastify.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  // ---- Logos de operadoras (Dados → Placement; slide Contrato Atual) ----

  fastify.get('/placement/operadora-logos', async (_request, reply) => {
    try {
      const rows = await prisma.placementOperadoraLogo.findMany({
        include: { operadora: { select: { id: true, nome: true } } },
        orderBy: { operadora: { nome: 'asc' } },
      });
      const logos = [];
      for (const r of rows) {
        if (await operadoraLogoFileExists(r)) {
          logos.push({
            id: r.id,
            operadoraId: r.operadoraId,
            operadoraNome: r.operadora.nome,
            mimeType: r.mimeType,
            size: r.size,
            updatedAt: r.updatedAt,
          });
        } else {
          await purgeOrphanOperadoraLogo(prisma, r.operadoraId);
        }
      }
      return { logos };
    } catch (error) {
      console.error('❌ GET /placement/operadora-logos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/operadora-logos/:operadoraId', async (request, reply) => {
    try {
      const { operadoraId } = request.params as { operadoraId: string };
      const row = await prisma.placementOperadoraLogo.findUnique({
        where: { operadoraId },
        include: { operadora: { select: { nome: true } } },
      });
      if (!row) return reply.status(404).send({ error: 'Logo não cadastrado' });
      if (!(await operadoraLogoFileExists(row))) {
        await purgeOrphanOperadoraLogo(prisma, operadoraId);
        return reply.status(404).send({ error: 'Arquivo não encontrado no servidor' });
      }
      return {
        logo: {
          id: row.id,
          operadoraId: row.operadoraId,
          operadoraNome: row.operadora.nome,
          mimeType: row.mimeType,
          size: row.size,
          updatedAt: row.updatedAt,
        },
      };
    } catch (error) {
      console.error('❌ GET /placement/operadora-logos/:operadoraId:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/operadora-logos/:operadoraId/image', async (request, reply) => {
    try {
      const { operadoraId } = request.params as { operadoraId: string };
      const row = await prisma.placementOperadoraLogo.findUnique({ where: { operadoraId } });
      if (!row) return reply.status(404).send({ error: 'Logo não encontrado' });
      const full = operadoraLogoAbsolutePath(row);
      if (!(await operadoraLogoFileExists(row))) {
        await purgeOrphanOperadoraLogo(prisma, operadoraId);
        return reply.status(404).send({ error: 'Arquivo não encontrado no servidor' });
      }
      reply.header('Content-Type', row.mimeType || 'image/png');
      reply.header('Cache-Control', 'public, max-age=3600');
      return reply.send(createReadStream(full));
    } catch (error) {
      console.error('❌ GET operadora logo image:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/operadora-logos/:operadoraId', async (request, reply) => {
    try {
      const { operadoraId } = request.params as { operadoraId: string };
      const op = await prisma.operadora.findUnique({ where: { id: operadoraId } });
      if (!op) return reply.status(404).send({ error: 'Operadora não encontrada' });

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({
          error: 'Arquivo obrigatório',
          message: 'Envie multipart/form-data com o campo "file" (PNG, JPEG ou WebP).',
        });
      }
      const mime = (file.mimetype || '').toLowerCase();
      if (!LOGO_MIME_ALLOWED.has(mime)) {
        return reply.status(400).send({
          error: 'Formato inválido',
          message: 'Use PNG, JPEG, WebP ou GIF.',
        });
      }
      const buf = await file.toBuffer();
      if (buf.length > LOGO_MAX_BYTES) {
        return reply.status(400).send({ error: 'Arquivo muito grande (máx. 2 MB)' });
      }

      const original = (file.filename || 'logo')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .slice(0, 120);
      const storedName = `${randomUUID()}_${original || 'logo'}`;
      const dir = operadoraLogoUploadDir(operadoraId);
      await fs.mkdir(dir, { recursive: true });

      const existing = await prisma.placementOperadoraLogo.findUnique({ where: { operadoraId } });
      if (existing) {
        try {
          await fs.unlink(path.join(dir, existing.storedName));
        } catch {
          /* */
        }
      }

      await fs.writeFile(path.join(dir, storedName), buf);

      const data = {
        nomeOriginal: original || 'logo',
        storedName,
        mimeType: mime,
        size: buf.length,
      };

      const row = existing
        ? await prisma.placementOperadoraLogo.update({
            where: { operadoraId },
            data,
            include: { operadora: { select: { nome: true } } },
          })
        : await prisma.placementOperadoraLogo.create({
            data: { operadoraId, ...data },
            include: { operadora: { select: { nome: true } } },
          });

      return reply.status(existing ? 200 : 201).send({
        logo: {
          id: row.id,
          operadoraId: row.operadoraId,
          operadoraNome: row.operadora.nome,
          mimeType: row.mimeType,
          size: row.size,
        },
      });
    } catch (error) {
      console.error('❌ POST /placement/operadora-logos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/operadora-logos/:operadoraId', async (request, reply) => {
    try {
      const { operadoraId } = request.params as { operadoraId: string };
      const row = await prisma.placementOperadoraLogo.findUnique({ where: { operadoraId } });
      if (!row) return reply.status(404).send({ error: 'Logo não encontrado' });
      try {
        await fs.unlink(path.join(operadoraLogoUploadDir(operadoraId), row.storedName));
      } catch {
        /* */
      }
      await prisma.placementOperadoraLogo.delete({ where: { operadoraId } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/operadora-logos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Consulta CNPJ (BrasilAPI pelo servidor; evita CORS e unifica erros) ----

  fastify.get('/placement/consulta-cnpj/:cnpj', async (request, reply) => {
    try {
      const { cnpj } = request.params as { cnpj: string };
      const digits = onlyDigits(cnpj);
      if (digits.length !== 14) {
        return reply.status(400).send({ error: 'CNPJ deve ter 14 dígitos' });
      }
      const res = await fetchBrasilCnpjEnrichment(digits);
      if (res.ok === false) {
        if (res.notFound) {
          return reply.status(404).send({
            error: 'CNPJ não encontrado',
            message: 'Não há cadastro público para este CNPJ na base consultada.',
          });
        }
        return reply.status(502).send({
          error: 'Consulta indisponível',
          message: 'Serviço externo retornou erro. Tente novamente em instantes.',
        });
      }
      return reply.send({
        razaoSocial: res.razaoSocial,
        cnae: res.cnae,
        nomeFantasia: res.nomeFantasia,
        cidade: res.cidade,
        uf: res.uf,
      });
    } catch (error) {
      console.error('❌ GET /placement/consulta-cnpj/:cnpj:', error);
      return reply.status(502).send({ error: 'Falha ao consultar CNPJ' });
    }
  });

  // ---- Filiais ----------------------------------------------------------

  fastify.get('/placement/filiais', async (_request, reply) => {
    try {
      const filiais = await prisma.placementFilial.findMany({
        orderBy: { razaoSocial: 'asc' },
      });
      return { filiais };
    } catch (error) {
      console.error('❌ GET /placement/filiais:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const filial = await prisma.placementFilial.findUnique({ where: { id } });
      if (!filial) return reply.status(404).send({ error: 'Filial não encontrada' });
      return filial;
    } catch (error) {
      console.error('❌ GET /placement/filiais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/filiais', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        razaoSocial?: string;
        cnpj?: string;
        status?: string;
      };

      const razaoSocial = String(body.razaoSocial ?? '').trim();
      const cnpjDigits = onlyDigits(String(body.cnpj ?? ''));
      const status = normalizeStatus(body.status);

      if (!razaoSocial) {
        return reply.status(400).send({ error: 'Razão social é obrigatória' });
      }
      if (cnpjDigits.length !== 14) {
        return reply
          .status(400)
          .send({ error: 'CNPJ inválido — informe os 14 dígitos' });
      }

      const exists = await prisma.placementFilial.findUnique({ where: { cnpj: cnpjDigits } });
      if (exists) {
        return reply.status(409).send({
          error: 'CNPJ já cadastrado',
          message: `Já existe uma filial cadastrada com este CNPJ (${exists.razaoSocial}).`,
        });
      }

      const created = await prisma.placementFilial.create({
        data: { razaoSocial, cnpj: cnpjDigits, status },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/filiais:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        razaoSocial?: string;
        cnpj?: string;
        status?: string;
      };

      const existing = await prisma.placementFilial.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Filial não encontrada' });

      const data: Record<string, unknown> = {};

      if (body.razaoSocial !== undefined) {
        const razaoSocial = String(body.razaoSocial).trim();
        if (!razaoSocial) {
          return reply.status(400).send({ error: 'Razão social é obrigatória' });
        }
        data.razaoSocial = razaoSocial;
      }

      if (body.cnpj !== undefined) {
        const cnpjDigits = onlyDigits(String(body.cnpj));
        if (cnpjDigits.length !== 14) {
          return reply
            .status(400)
            .send({ error: 'CNPJ inválido — informe os 14 dígitos' });
        }
        if (cnpjDigits !== existing.cnpj) {
          const dup = await prisma.placementFilial.findUnique({ where: { cnpj: cnpjDigits } });
          if (dup && dup.id !== id) {
            return reply.status(409).send({
              error: 'CNPJ já cadastrado',
              message: `Já existe outra filial com este CNPJ (${dup.razaoSocial}).`,
            });
          }
        }
        data.cnpj = cnpjDigits;
      }

      if (body.status !== undefined) {
        data.status = normalizeStatus(body.status);
      }

      const updated = await prisma.placementFilial.update({ where: { id }, data });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/filiais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementFilial.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Filial não encontrada' });

      await prisma.placementFilial.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/filiais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Planos (fornecedor + categoria + plano) -------------------------

  fastify.get('/placement/planos', async (_request, reply) => {
    try {
      const planos = await prisma.placementPlano.findMany({
        orderBy: [{ operadoraId: 'asc' }, { categoria: 'asc' }, { plano: 'asc' }],
        include: { operadora: { select: { id: true, nome: true } } },
      });
      return { planos };
    } catch (error) {
      console.error('❌ GET /placement/planos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/planos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const row = await prisma.placementPlano.findUnique({
        where: { id },
        include: { operadora: { select: { id: true, nome: true } } },
      });
      if (!row) return reply.status(404).send({ error: 'Plano não encontrado' });
      return row;
    } catch (error) {
      console.error('❌ GET /placement/planos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/planos', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        operadoraId?: string;
        categoria?: string;
        plano?: string;
        reembolso?: string | null;
        eventosReembolsaveis?: string | null;
        acomodacao?: string | null;
        abrangencia?: string | null;
      };

      const operadoraId = String(body.operadoraId ?? '').trim();
      const categoria = String(body.categoria ?? '').trim();
      const plano = String(body.plano ?? '').trim();
      if (!operadoraId) {
        return reply.status(400).send({ error: 'Fornecedor (operadora) é obrigatório' });
      }
      if (!categoria) {
        return reply.status(400).send({ error: 'Categoria é obrigatória' });
      }
      if (!plano) {
        return reply.status(400).send({ error: 'Plano é obrigatório' });
      }

      const operadora = await prisma.operadora.findUnique({ where: { id: operadoraId } });
      if (!operadora) {
        return reply.status(400).send({ error: 'Operadora (fornecedor) não encontrada' });
      }

      const created = await prisma.placementPlano.create({
        data: {
          operadoraId,
          categoria,
          plano,
          reembolso: body.reembolso != null ? String(body.reembolso).trim() || null : null,
          eventosReembolsaveis:
            body.eventosReembolsaveis != null ? String(body.eventosReembolsaveis).trim() || null : null,
          acomodacao: body.acomodacao != null ? String(body.acomodacao).trim() || null : null,
          abrangencia: body.abrangencia != null ? String(body.abrangencia).trim() || null : null,
        },
        include: { operadora: { select: { id: true, nome: true } } },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/planos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/planos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        operadoraId?: string;
        categoria?: string;
        plano?: string;
        reembolso?: string | null;
        eventosReembolsaveis?: string | null;
        acomodacao?: string | null;
        abrangencia?: string | null;
      };

      const existing = await prisma.placementPlano.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Plano não encontrado' });

      const data: Record<string, unknown> = {};

      if (body.operadoraId !== undefined) {
        const operadoraId = String(body.operadoraId).trim();
        if (!operadoraId) {
          return reply.status(400).send({ error: 'Fornecedor (operadora) é obrigatório' });
        }
        const operadora = await prisma.operadora.findUnique({ where: { id: operadoraId } });
        if (!operadora) {
          return reply.status(400).send({ error: 'Operadora (fornecedor) não encontrada' });
        }
        data.operadoraId = operadoraId;
      }

      if (body.categoria !== undefined) {
        const categoria = String(body.categoria).trim();
        if (!categoria) return reply.status(400).send({ error: 'Categoria é obrigatória' });
        data.categoria = categoria;
      }

      if (body.plano !== undefined) {
        const plano = String(body.plano).trim();
        if (!plano) return reply.status(400).send({ error: 'Plano é obrigatório' });
        data.plano = plano;
      }

      if (body.reembolso !== undefined) {
        data.reembolso = body.reembolso != null ? String(body.reembolso).trim() || null : null;
      }
      if (body.eventosReembolsaveis !== undefined) {
        data.eventosReembolsaveis =
          body.eventosReembolsaveis != null ? String(body.eventosReembolsaveis).trim() || null : null;
      }
      if (body.acomodacao !== undefined) {
        data.acomodacao = body.acomodacao != null ? String(body.acomodacao).trim() || null : null;
      }
      if (body.abrangencia !== undefined) {
        data.abrangencia = body.abrangencia != null ? String(body.abrangencia).trim() || null : null;
      }

      const updated = await prisma.placementPlano.update({
        where: { id },
        data,
        include: { operadora: { select: { id: true, nome: true } } },
      });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/planos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/planos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementPlano.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Plano não encontrado' });
      await prisma.placementPlano.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/planos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Diferenciais + Condições contratuais ------------------------

  const DIFERENCIAL_ITEM_KEYS = new Set([
    'telemedicina',
    'telepsicologia',
    'assistencia_viagem',
    'coleta_domiciliar',
    'vacinas_calendario',
    'retaguarda',
    'check_up',
    'resgate_domiciliar',
    'resgate_saude',
  ]);

  const CONDICAO_CONTRATUAL_ITEM_KEYS = new Set([
    'vigencia_contratual',
    'tipo_contratacao',
    'modalidade_contrato',
    'regra_contribuicao',
    'aviso_previo',
    'clausula_cancelamento',
    'meritocracia_parto',
    'prazo_inclusao',
    'remissao',
    'taxa_inscricao',
    'iof',
    'break_even',
    'reajuste_financeiro',
    'reajuste_tecnico',
    'validade_proposta',
  ]);

  const condicaoInclude = {
    operadora: { select: { id: true, nome: true } },
    placementPlano: {
      select: { id: true, plano: true, categoria: true, operadoraId: true },
    },
  } as const;

  function normalizeCondicaoBody(body: {
    operadoraId?: string
    porPlano?: boolean
    placementPlanoId?: string | null
    itemKey?: string
    texto?: string
  }) {
    const operadoraId = String(body.operadoraId ?? '').trim()
    const porPlano = body.porPlano === true
    const placementPlanoId = porPlano ? String(body.placementPlanoId ?? '').trim() : ''
    const itemKey = String(body.itemKey ?? '').trim()
    const texto = String(body.texto ?? '').trim()
    return { operadoraId, porPlano, placementPlanoId, itemKey, texto }
  }

  async function validateCondicaoRefs(reply: any, input: {
    operadoraId: string
    porPlano: boolean
    placementPlanoId: string
    itemKey: string
    texto: string
  }) {
    if (!input.operadoraId) {
      return reply.status(400).send({ error: 'Fornecedor (operadora) é obrigatório' })
    }
    if (!input.itemKey || !CONDICAO_CONTRATUAL_ITEM_KEYS.has(input.itemKey)) {
      return reply.status(400).send({ error: 'Item de condição contratual inválido' })
    }
    if (!input.texto) {
      return reply.status(400).send({ error: 'Texto é obrigatório' })
    }
    if (input.porPlano && !input.placementPlanoId) {
      return reply.status(400).send({ error: 'Plano é obrigatório quando a condição é por plano' })
    }
    const operadora = await prisma.operadora.findUnique({ where: { id: input.operadoraId } })
    if (!operadora) {
      return reply.status(400).send({ error: 'Operadora (fornecedor) não encontrada' })
    }
    if (input.porPlano) {
      const plano = await prisma.placementPlano.findUnique({ where: { id: input.placementPlanoId } })
      if (!plano) {
        return reply.status(400).send({ error: 'Plano não encontrado' })
      }
      if (plano.operadoraId !== input.operadoraId) {
        return reply.status(400).send({ error: 'O plano selecionado não pertence ao fornecedor informado' })
      }
    }
    return null
  }

  fastify.get('/placement/condicoes-contratuais', async (_request, reply) => {
    try {
      const condicoes = await prisma.placementCondicaoContratual.findMany({
        orderBy: [{ operadoraId: 'asc' }, { itemKey: 'asc' }, { porPlano: 'asc' }],
        include: condicaoInclude,
      })
      return { condicoes }
    } catch (error) {
      console.error('❌ GET /placement/condicoes-contratuais:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.get('/placement/condicoes-contratuais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const row = await prisma.placementCondicaoContratual.findUnique({
        where: { id },
        include: condicaoInclude,
      })
      if (!row) return reply.status(404).send({ error: 'Condição contratual não encontrada' })
      return row
    } catch (error) {
      console.error('❌ GET /placement/condicoes-contratuais/:id:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.post('/placement/condicoes-contratuais', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        operadoraId?: string
        porPlano?: boolean
        placementPlanoId?: string | null
        itemKey?: string
        texto?: string
      }
      const input = normalizeCondicaoBody(body)
      const invalid = await validateCondicaoRefs(reply, input)
      if (invalid) return invalid

      const created = await prisma.placementCondicaoContratual.create({
        data: {
          operadoraId: input.operadoraId,
          porPlano: input.porPlano,
          placementPlanoId: input.porPlano ? input.placementPlanoId : null,
          itemKey: input.itemKey,
          texto: input.texto,
        },
        include: condicaoInclude,
      })
      return reply.status(201).send(created)
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Já existe condição contratual para este fornecedor/item (e plano, se aplicável).',
        })
      }
      console.error('❌ POST /placement/condicoes-contratuais:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.post('/placement/condicoes-contratuais/upsert-batch', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        items?: Array<{
          operadoraId?: string
          porPlano?: boolean
          placementPlanoId?: string | null
          itemKey?: string
          texto?: string
        }>
      }
      const items = Array.isArray(body.items) ? body.items : []
      if (!items.length) {
        return reply.status(400).send({ error: 'Informe items[] para sincronizar.' })
      }

      let synced = 0
      let skipped = 0
      const upserted: any[] = []

      for (const raw of items) {
        const input = normalizeCondicaoBody(raw)
        if (
          !input.operadoraId ||
          !input.itemKey ||
          !CONDICAO_CONTRATUAL_ITEM_KEYS.has(input.itemKey) ||
          !input.texto ||
          (input.porPlano && !input.placementPlanoId)
        ) {
          skipped += 1
          continue
        }

        const operadora = await prisma.operadora.findUnique({ where: { id: input.operadoraId } })
        if (!operadora) {
          skipped += 1
          continue
        }
        if (input.porPlano) {
          const plano = await prisma.placementPlano.findUnique({ where: { id: input.placementPlanoId } })
          if (!plano || plano.operadoraId !== input.operadoraId) {
            skipped += 1
            continue
          }
        }

        const existing = await prisma.placementCondicaoContratual.findFirst({
          where: input.porPlano
            ? {
                operadoraId: input.operadoraId,
                itemKey: input.itemKey,
                porPlano: true,
                placementPlanoId: input.placementPlanoId,
              }
            : {
                operadoraId: input.operadoraId,
                itemKey: input.itemKey,
                porPlano: false,
              },
        })

        const row = existing
          ? await prisma.placementCondicaoContratual.update({
              where: { id: existing.id },
              data: {
                texto: input.texto,
                porPlano: input.porPlano,
                placementPlanoId: input.porPlano ? input.placementPlanoId : null,
              },
              include: condicaoInclude,
            })
          : await prisma.placementCondicaoContratual.create({
              data: {
                operadoraId: input.operadoraId,
                porPlano: input.porPlano,
                placementPlanoId: input.porPlano ? input.placementPlanoId : null,
                itemKey: input.itemKey,
                texto: input.texto,
              },
              include: condicaoInclude,
            })

        upserted.push(row)
        synced += 1
      }

      return { synced, skipped, condicoes: upserted }
    } catch (error) {
      console.error('❌ POST /placement/condicoes-contratuais/upsert-batch:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.put('/placement/condicoes-contratuais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = (request.body ?? {}) as {
        operadoraId?: string
        porPlano?: boolean
        placementPlanoId?: string | null
        itemKey?: string
        texto?: string
      }
      const existing = await prisma.placementCondicaoContratual.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ error: 'Condição contratual não encontrada' })

      const input = normalizeCondicaoBody({
        operadoraId: body.operadoraId ?? existing.operadoraId,
        porPlano: body.porPlano ?? existing.porPlano,
        placementPlanoId:
          body.placementPlanoId !== undefined ? body.placementPlanoId : existing.placementPlanoId,
        itemKey: body.itemKey ?? existing.itemKey,
        texto: body.texto ?? existing.texto,
      })
      const invalid = await validateCondicaoRefs(reply, input)
      if (invalid) return invalid

      const updated = await prisma.placementCondicaoContratual.update({
        where: { id },
        data: {
          operadoraId: input.operadoraId,
          porPlano: input.porPlano,
          placementPlanoId: input.porPlano ? input.placementPlanoId : null,
          itemKey: input.itemKey,
          texto: input.texto,
        },
        include: condicaoInclude,
      })
      return updated
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Já existe condição contratual para este fornecedor/item (e plano, se aplicável).',
        })
      }
      console.error('❌ PUT /placement/condicoes-contratuais/:id:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.delete('/placement/condicoes-contratuais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      await prisma.placementCondicaoContratual.delete({ where: { id } })
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ DELETE /placement/condicoes-contratuais/:id:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  const INDICADOR_OPERADORA_ITEM_KEYS = new Set([
    'idss',
    'endiv',
    'lg',
    'impacto_endiv_lg',
    'porte_operadora',
    'tempo_registro_ans',
    'segmento',
    'vidas_administradas',
  ])

  const indicadorInclude = {
    operadora: { select: { id: true, nome: true } },
  } as const

  function normalizeIndicadorBody(body: {
    operadoraId?: string
    itemKey?: string
    texto?: string
  }) {
    return {
      operadoraId: String(body.operadoraId ?? '').trim(),
      itemKey: String(body.itemKey ?? '').trim(),
      texto: String(body.texto ?? '').trim(),
    }
  }

  async function validateIndicadorRefs(
    reply: any,
    input: { operadoraId: string; itemKey: string; texto: string }
  ) {
    if (!input.operadoraId) {
      return reply.status(400).send({ error: 'Fornecedor (operadora) é obrigatório' })
    }
    if (!input.itemKey || !INDICADOR_OPERADORA_ITEM_KEYS.has(input.itemKey)) {
      return reply.status(400).send({ error: 'Item de indicador inválido' })
    }
    if (!input.texto) {
      return reply.status(400).send({ error: 'Texto/valor é obrigatório' })
    }
    const operadora = await prisma.operadora.findUnique({ where: { id: input.operadoraId } })
    if (!operadora) {
      return reply.status(400).send({ error: 'Operadora (fornecedor) não encontrada' })
    }
    return null
  }

  fastify.get('/placement/indicadores-operadoras', async (_request, reply) => {
    try {
      const indicadores = await prisma.placementIndicadorOperadora.findMany({
        orderBy: [{ operadoraId: 'asc' }, { itemKey: 'asc' }],
        include: indicadorInclude,
      })
      return { indicadores }
    } catch (error) {
      console.error('❌ GET /placement/indicadores-operadoras:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.get('/placement/indicadores-operadoras/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const row = await prisma.placementIndicadorOperadora.findUnique({
        where: { id },
        include: indicadorInclude,
      })
      if (!row) return reply.status(404).send({ error: 'Indicador não encontrado' })
      return row
    } catch (error) {
      console.error('❌ GET /placement/indicadores-operadoras/:id:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.post('/placement/indicadores-operadoras', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        operadoraId?: string
        itemKey?: string
        texto?: string
      }
      const input = normalizeIndicadorBody(body)
      const invalid = await validateIndicadorRefs(reply, input)
      if (invalid) return invalid

      const created = await prisma.placementIndicadorOperadora.create({
        data: {
          operadoraId: input.operadoraId,
          itemKey: input.itemKey,
          texto: input.texto,
        },
        include: indicadorInclude,
      })
      return reply.status(201).send(created)
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Já existe indicador para este fornecedor/item.',
        })
      }
      console.error('❌ POST /placement/indicadores-operadoras:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.post('/placement/indicadores-operadoras/upsert-batch', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        items?: Array<{ operadoraId?: string; itemKey?: string; texto?: string }>
      }
      const items = Array.isArray(body.items) ? body.items : []
      if (!items.length) {
        return reply.status(400).send({ error: 'Informe items[] para sincronizar.' })
      }

      let synced = 0
      let skipped = 0
      const upserted: any[] = []

      for (const raw of items) {
        const input = normalizeIndicadorBody(raw)
        if (
          !input.operadoraId ||
          !input.itemKey ||
          !INDICADOR_OPERADORA_ITEM_KEYS.has(input.itemKey) ||
          !input.texto
        ) {
          skipped += 1
          continue
        }
        const operadora = await prisma.operadora.findUnique({ where: { id: input.operadoraId } })
        if (!operadora) {
          skipped += 1
          continue
        }

        const existing = await prisma.placementIndicadorOperadora.findFirst({
          where: { operadoraId: input.operadoraId, itemKey: input.itemKey },
        })

        const row = existing
          ? await prisma.placementIndicadorOperadora.update({
              where: { id: existing.id },
              data: { texto: input.texto },
              include: indicadorInclude,
            })
          : await prisma.placementIndicadorOperadora.create({
              data: {
                operadoraId: input.operadoraId,
                itemKey: input.itemKey,
                texto: input.texto,
              },
              include: indicadorInclude,
            })

        upserted.push(row)
        synced += 1
      }

      return { synced, skipped, indicadores: upserted }
    } catch (error) {
      console.error('❌ POST /placement/indicadores-operadoras/upsert-batch:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.put('/placement/indicadores-operadoras/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = (request.body ?? {}) as {
        operadoraId?: string
        itemKey?: string
        texto?: string
      }
      const existing = await prisma.placementIndicadorOperadora.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ error: 'Indicador não encontrado' })

      const input = normalizeIndicadorBody({
        operadoraId: body.operadoraId ?? existing.operadoraId,
        itemKey: body.itemKey ?? existing.itemKey,
        texto: body.texto ?? existing.texto,
      })
      const invalid = await validateIndicadorRefs(reply, input)
      if (invalid) return invalid

      const updated = await prisma.placementIndicadorOperadora.update({
        where: { id },
        data: {
          operadoraId: input.operadoraId,
          itemKey: input.itemKey,
          texto: input.texto,
        },
        include: indicadorInclude,
      })
      return updated
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Já existe indicador para este fornecedor/item.',
        })
      }
      console.error('❌ PUT /placement/indicadores-operadoras/:id:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.delete('/placement/indicadores-operadoras/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      await prisma.placementIndicadorOperadora.delete({ where: { id } })
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ DELETE /placement/indicadores-operadoras/:id:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.get('/placement/diferenciais', async (_request, reply) => {
    try {
      const diferenciais = await prisma.placementDiferencial.findMany({
        orderBy: [
          { operadoraId: 'asc' },
          { placementPlanoId: 'asc' },
          { itemKey: 'asc' },
        ],
        include: {
          operadora: { select: { id: true, nome: true } },
          placementPlano: {
            select: { id: true, plano: true, categoria: true, operadoraId: true },
          },
        },
      });
      return { diferenciais };
    } catch (error) {
      console.error('❌ GET /placement/diferenciais:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/diferenciais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const row = await prisma.placementDiferencial.findUnique({
        where: { id },
        include: {
          operadora: { select: { id: true, nome: true } },
          placementPlano: {
            select: { id: true, plano: true, categoria: true, operadoraId: true },
          },
        },
      });
      if (!row) return reply.status(404).send({ error: 'Diferencial não encontrado' });
      return row;
    } catch (error) {
      console.error('❌ GET /placement/diferenciais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/diferenciais', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        operadoraId?: string;
        placementPlanoId?: string;
        itemKey?: string;
        texto?: string;
      };

      const operadoraId = String(body.operadoraId ?? '').trim();
      const placementPlanoId = String(body.placementPlanoId ?? '').trim();
      const itemKey = String(body.itemKey ?? '').trim();
      const texto = String(body.texto ?? '').trim();

      if (!operadoraId) {
        return reply.status(400).send({ error: 'Fornecedor (operadora) é obrigatório' });
      }
      if (!placementPlanoId) {
        return reply.status(400).send({ error: 'Plano é obrigatório' });
      }
      if (!itemKey || !DIFERENCIAL_ITEM_KEYS.has(itemKey)) {
        return reply.status(400).send({ error: 'Item de diferencial inválido' });
      }
      if (!texto) {
        return reply.status(400).send({ error: 'Texto é obrigatório' });
      }

      const operadora = await prisma.operadora.findUnique({ where: { id: operadoraId } });
      if (!operadora) {
        return reply.status(400).send({ error: 'Operadora (fornecedor) não encontrada' });
      }

      const plano = await prisma.placementPlano.findUnique({ where: { id: placementPlanoId } });
      if (!plano) {
        return reply.status(400).send({ error: 'Plano não encontrado' });
      }
      if (plano.operadoraId !== operadoraId) {
        return reply.status(400).send({ error: 'O plano selecionado não pertence ao fornecedor informado' });
      }

      const created = await prisma.placementDiferencial.create({
        data: { operadoraId, placementPlanoId, itemKey, texto },
        include: {
          operadora: { select: { id: true, nome: true } },
          placementPlano: {
            select: { id: true, plano: true, categoria: true, operadoraId: true },
          },
        },
      });
      return reply.status(201).send(created);
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Já existe um diferencial para este fornecedor, plano e item',
        });
      }
      console.error('❌ POST /placement/diferenciais:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/diferenciais/upsert-batch', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        items?: Array<{
          operadoraId?: string;
          placementPlanoId?: string;
          itemKey?: string;
          texto?: string;
        }>;
      };

      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (!rawItems.length) {
        return { synced: 0, skipped: 0, diferenciais: [] };
      }

      const diferenciais: Awaited<ReturnType<typeof prisma.placementDiferencial.upsert>>[] = [];
      let skipped = 0;

      for (const raw of rawItems) {
        const operadoraId = String(raw.operadoraId ?? '').trim();
        const placementPlanoId = String(raw.placementPlanoId ?? '').trim();
        const itemKey = String(raw.itemKey ?? '').trim();
        const texto = String(raw.texto ?? '').trim();

        if (!operadoraId || !placementPlanoId || !itemKey || !texto) {
          skipped += 1;
          continue;
        }
        if (!DIFERENCIAL_ITEM_KEYS.has(itemKey)) {
          skipped += 1;
          continue;
        }

        const operadora = await prisma.operadora.findUnique({ where: { id: operadoraId } });
        if (!operadora) {
          skipped += 1;
          continue;
        }

        const plano = await prisma.placementPlano.findUnique({ where: { id: placementPlanoId } });
        if (!plano || plano.operadoraId !== operadoraId) {
          skipped += 1;
          continue;
        }

        const row = await prisma.placementDiferencial.upsert({
          where: {
            operadoraId_placementPlanoId_itemKey: {
              operadoraId,
              placementPlanoId,
              itemKey,
            },
          },
          create: { operadoraId, placementPlanoId, itemKey, texto },
          update: { texto },
          include: {
            operadora: { select: { id: true, nome: true } },
            placementPlano: {
              select: { id: true, plano: true, categoria: true, operadoraId: true },
            },
          },
        });
        diferenciais.push(row);
      }

      return { synced: diferenciais.length, skipped, diferenciais };
    } catch (error) {
      console.error('❌ POST /placement/diferenciais/upsert-batch:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/diferenciais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        operadoraId?: string;
        placementPlanoId?: string;
        itemKey?: string;
        texto?: string;
      };

      const existing = await prisma.placementDiferencial.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Diferencial não encontrado' });

      const operadoraId =
        body.operadoraId !== undefined ? String(body.operadoraId).trim() : existing.operadoraId;
      const placementPlanoId =
        body.placementPlanoId !== undefined
          ? String(body.placementPlanoId).trim()
          : existing.placementPlanoId;
      const itemKey = body.itemKey !== undefined ? String(body.itemKey).trim() : existing.itemKey;
      const texto = body.texto !== undefined ? String(body.texto).trim() : existing.texto;

      if (!operadoraId) {
        return reply.status(400).send({ error: 'Fornecedor (operadora) é obrigatório' });
      }
      if (!placementPlanoId) {
        return reply.status(400).send({ error: 'Plano é obrigatório' });
      }
      if (!itemKey || !DIFERENCIAL_ITEM_KEYS.has(itemKey)) {
        return reply.status(400).send({ error: 'Item de diferencial inválido' });
      }
      if (!texto) {
        return reply.status(400).send({ error: 'Texto é obrigatório' });
      }

      const operadora = await prisma.operadora.findUnique({ where: { id: operadoraId } });
      if (!operadora) {
        return reply.status(400).send({ error: 'Operadora (fornecedor) não encontrada' });
      }

      const plano = await prisma.placementPlano.findUnique({ where: { id: placementPlanoId } });
      if (!plano) {
        return reply.status(400).send({ error: 'Plano não encontrado' });
      }
      if (plano.operadoraId !== operadoraId) {
        return reply.status(400).send({ error: 'O plano selecionado não pertence ao fornecedor informado' });
      }

      const updated = await prisma.placementDiferencial.update({
        where: { id },
        data: { operadoraId, placementPlanoId, itemKey, texto },
        include: {
          operadora: { select: { id: true, nome: true } },
          placementPlano: {
            select: { id: true, plano: true, categoria: true, operadoraId: true },
          },
        },
      });
      return updated;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Já existe um diferencial para este fornecedor, plano e item',
        });
      }
      console.error('❌ PUT /placement/diferenciais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/diferenciais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementDiferencial.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Diferencial não encontrado' });
      await prisma.placementDiferencial.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/diferenciais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- (continua abaixo) ------------------------------------------------

  // ---- Corretores parceiros ---------------------------------------------

  fastify.get('/placement/corretores-parceiros', async (_request, reply) => {
    try {
      const corretoresParceiros = await prisma.placementCorretorParceiro.findMany({
        orderBy: { nome: 'asc' },
      });
      return { corretoresParceiros };
    } catch (error) {
      console.error('❌ GET /placement/corretores-parceiros:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/corretores-parceiros/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const row = await prisma.placementCorretorParceiro.findUnique({ where: { id } });
      if (!row) return reply.status(404).send({ error: 'Corretor parceiro não encontrado' });
      return row;
    } catch (error) {
      console.error('❌ GET /placement/corretores-parceiros/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/corretores-parceiros', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) {
        return reply.status(400).send({ error: 'Nome é obrigatório' });
      }
      const created = await prisma.placementCorretorParceiro.create({
        data: { nome },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/corretores-parceiros:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/corretores-parceiros/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementCorretorParceiro.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Corretor parceiro não encontrado' });
      if (body.nome === undefined) {
        return reply.status(400).send({ error: 'Informe o nome' });
      }
      const nome = String(body.nome).trim();
      if (!nome) {
        return reply.status(400).send({ error: 'Nome é obrigatório' });
      }
      const updated = await prisma.placementCorretorParceiro.update({
        where: { id },
        data: { nome },
      });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/corretores-parceiros/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/corretores-parceiros/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementCorretorParceiro.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Corretor parceiro não encontrado' });
      await prisma.placementCorretorParceiro.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/corretores-parceiros/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Projetos / Pedido (catálogo nome) --------------------------------

  fastify.get('/placement/projetos', async (_request, reply) => {
    try {
      const projetos = await prisma.placementProjeto.findMany({ orderBy: { nome: 'asc' } });
      return { projetos };
    } catch (error) {
      console.error('❌ GET /placement/projetos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/projetos', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const created = await prisma.placementProjeto.create({ data: { nome } });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/projetos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/projetos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementProjeto.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Projeto não encontrado' });
      if (body.nome === undefined) return reply.status(400).send({ error: 'Informe o nome' });
      const nome = String(body.nome).trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const updated = await prisma.placementProjeto.update({ where: { id }, data: { nome } });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/projetos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/projetos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementProjeto.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Projeto não encontrado' });
      await prisma.placementProjeto.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/projetos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/pedidos', async (_request, reply) => {
    try {
      const pedidos = await prisma.placementPedido.findMany({ orderBy: { nome: 'asc' } });
      return { pedidos };
    } catch (error) {
      console.error('❌ GET /placement/pedidos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/pedidos', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const created = await prisma.placementPedido.create({ data: { nome } });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/pedidos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/pedidos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementPedido.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Pedido não encontrado' });
      if (body.nome === undefined) return reply.status(400).send({ error: 'Informe o nome' });
      const nome = String(body.nome).trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const updated = await prisma.placementPedido.update({ where: { id }, data: { nome } });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/pedidos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/pedidos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementPedido.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Pedido não encontrado' });
      await prisma.placementPedido.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/pedidos/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/temperaturas', async (_request, reply) => {
    try {
      const temperaturas = await prisma.placementTemperatura.findMany({ orderBy: { nome: 'asc' } });
      return { temperaturas };
    } catch (error) {
      console.error('❌ GET /placement/temperaturas:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/temperaturas', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const created = await prisma.placementTemperatura.create({ data: { nome } });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/temperaturas:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/temperaturas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementTemperatura.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Temperatura não encontrada' });
      if (body.nome === undefined) return reply.status(400).send({ error: 'Informe o nome' });
      const nome = String(body.nome).trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const updated = await prisma.placementTemperatura.update({ where: { id }, data: { nome } });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/temperaturas/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/temperaturas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementTemperatura.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Temperatura não encontrada' });
      await prisma.placementTemperatura.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/temperaturas/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Analistas (catálogo Placement — responsável pelo processo) ------------

  fastify.get('/placement/analistas', async (_request, reply) => {
    try {
      const analistas = await prisma.placementAnalista.findMany({ orderBy: { nome: 'asc' } });
      return { analistas };
    } catch (error) {
      console.error('❌ GET /placement/analistas:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/analistas', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const nome = String(body.nome ?? '').trim();
      const coordenadorAnalista = String(body.coordenadorAnalista ?? '').trim();
      const gerenteAnalista = String(body.gerenteAnalista ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome do analista é obrigatório' });
      if (!coordenadorAnalista) {
        return reply.status(400).send({ error: 'Coordenador analista é obrigatório' });
      }
      if (!gerenteAnalista) {
        return reply.status(400).send({ error: 'Gerente analista é obrigatório' });
      }
      const created = await prisma.placementAnalista.create({
        data: { nome, coordenadorAnalista, gerenteAnalista },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/analistas:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/analistas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const existing = await prisma.placementAnalista.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Analista não encontrado' });
      const nome = body.nome !== undefined ? String(body.nome ?? '').trim() : existing.nome;
      const coordenadorAnalista =
        body.coordenadorAnalista !== undefined
          ? String(body.coordenadorAnalista ?? '').trim()
          : existing.coordenadorAnalista;
      const gerenteAnalista =
        body.gerenteAnalista !== undefined
          ? String(body.gerenteAnalista ?? '').trim()
          : existing.gerenteAnalista;
      if (!nome) return reply.status(400).send({ error: 'Nome do analista é obrigatório' });
      if (!coordenadorAnalista) {
        return reply.status(400).send({ error: 'Coordenador analista é obrigatório' });
      }
      if (!gerenteAnalista) {
        return reply.status(400).send({ error: 'Gerente analista é obrigatório' });
      }
      const updated = await prisma.placementAnalista.update({
        where: { id },
        data: { nome, coordenadorAnalista, gerenteAnalista },
      });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/analistas/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/analistas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementAnalista.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Analista não encontrado' });
      await prisma.placementAnalista.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/analistas/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Tipo de contratação / modalidade / prazo vigência (catálogo nome) ----

  fastify.get('/placement/tipos-contratacao', async (_request, reply) => {
    try {
      const tiposContratacao = await prisma.placementTipoContratacao.findMany({
        orderBy: { nome: 'asc' },
      });
      return { tiposContratacao };
    } catch (error) {
      console.error('❌ GET /placement/tipos-contratacao:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/tipos-contratacao', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const created = await prisma.placementTipoContratacao.create({ data: { nome } });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/tipos-contratacao:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/tipos-contratacao/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementTipoContratacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Registro não encontrado' });
      if (body.nome === undefined) return reply.status(400).send({ error: 'Informe o nome' });
      const nome = String(body.nome).trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const updated = await prisma.placementTipoContratacao.update({ where: { id }, data: { nome } });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/tipos-contratacao/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/tipos-contratacao/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementTipoContratacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Registro não encontrado' });
      await prisma.placementTipoContratacao.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/tipos-contratacao/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/modalidades-contrato', async (_request, reply) => {
    try {
      const modalidadesContrato = await prisma.placementModalidadeContrato.findMany({
        orderBy: { nome: 'asc' },
      });
      return { modalidadesContrato };
    } catch (error) {
      console.error('❌ GET /placement/modalidades-contrato:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/modalidades-contrato', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const created = await prisma.placementModalidadeContrato.create({ data: { nome } });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/modalidades-contrato:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/modalidades-contrato/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementModalidadeContrato.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Registro não encontrado' });
      if (body.nome === undefined) return reply.status(400).send({ error: 'Informe o nome' });
      const nome = String(body.nome).trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const updated = await prisma.placementModalidadeContrato.update({ where: { id }, data: { nome } });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/modalidades-contrato/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/modalidades-contrato/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementModalidadeContrato.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Registro não encontrado' });
      await prisma.placementModalidadeContrato.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/modalidades-contrato/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/prazos-vigencia-contrato', async (_request, reply) => {
    try {
      const prazosVigenciaContrato = await prisma.placementPrazoVigenciaContrato.findMany({
        orderBy: { nome: 'asc' },
      });
      return { prazosVigenciaContrato };
    } catch (error) {
      console.error('❌ GET /placement/prazos-vigencia-contrato:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/prazos-vigencia-contrato', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { nome?: string };
      const nome = String(body.nome ?? '').trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const created = await prisma.placementPrazoVigenciaContrato.create({ data: { nome } });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/prazos-vigencia-contrato:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/prazos-vigencia-contrato/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { nome?: string };
      const existing = await prisma.placementPrazoVigenciaContrato.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Registro não encontrado' });
      if (body.nome === undefined) return reply.status(400).send({ error: 'Informe o nome' });
      const nome = String(body.nome).trim();
      if (!nome) return reply.status(400).send({ error: 'Nome é obrigatório' });
      const updated = await prisma.placementPrazoVigenciaContrato.update({ where: { id }, data: { nome } });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/prazos-vigencia-contrato/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/prazos-vigencia-contrato/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementPrazoVigenciaContrato.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Registro não encontrado' });
      await prisma.placementPrazoVigenciaContrato.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/prazos-vigencia-contrato/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Prospects --------------------------------------------------------

  /** Cadastros de prospects (clientes potenciais) do módulo Placement. */
  fastify.get('/placement/prospects', async (_request, reply) => {
    try {
      const prospects = await prisma.placementProspect.findMany({
        orderBy: { razaoSocial: 'asc' },
      });
      return { prospects };
    } catch (error) {
      console.error('❌ GET /placement/prospects:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/prospects/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prospect = await prisma.placementProspect.findUnique({ where: { id } });
      if (!prospect) return reply.status(404).send({ error: 'Prospect não encontrado' });
      return prospect;
    } catch (error) {
      console.error('❌ GET /placement/prospects/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/prospects', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        razaoSocial?: string;
        cnpj?: string;
        grupoEconomico?: string;
        cnae?: string;
      };

      const razaoSocial = String(body.razaoSocial ?? '').trim();
      const cnpjDigits = onlyDigits(String(body.cnpj ?? ''));
      const grupoEconomico = body.grupoEconomico ? String(body.grupoEconomico).trim() : null;
      const cnaeDigits = normalizeCnae(body.cnae);

      if (!razaoSocial) {
        return reply.status(400).send({ error: 'Razão social é obrigatória' });
      }
      if (cnpjDigits.length !== 14) {
        return reply
          .status(400)
          .send({ error: 'CNPJ inválido — informe os 14 dígitos' });
      }
      if (!isValidCnaeDigits(cnaeDigits)) {
        return reply.status(400).send({
          error: 'CNAE inválido',
          message: 'Informe o CNAE com 7 ou 8 dígitos (apenas números).',
        });
      }

      const exists = await prisma.placementProspect.findUnique({ where: { cnpj: cnpjDigits } });
      if (exists) {
        return reply.status(409).send({
          error: 'CNPJ já cadastrado',
          message: `Já existe um prospect cadastrado com este CNPJ (${exists.razaoSocial}).`,
        });
      }

      const created = await prisma.placementProspect.create({
        data: { razaoSocial, cnpj: cnpjDigits, grupoEconomico, cnae: cnaeDigits },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/prospects:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/prospects/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        razaoSocial?: string;
        cnpj?: string;
        grupoEconomico?: string;
        cnae?: string;
      };

      const existing = await prisma.placementProspect.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Prospect não encontrado' });

      const data: Record<string, unknown> = {};

      if (body.razaoSocial !== undefined) {
        const razaoSocial = String(body.razaoSocial).trim();
        if (!razaoSocial) {
          return reply.status(400).send({ error: 'Razão social é obrigatória' });
        }
        data.razaoSocial = razaoSocial;
      }

      if (body.cnpj !== undefined) {
        const cnpjDigits = onlyDigits(String(body.cnpj));
        if (cnpjDigits.length !== 14) {
          return reply.status(400).send({ error: 'CNPJ inválido — informe os 14 dígitos' });
        }
        if (cnpjDigits !== existing.cnpj) {
          const dup = await prisma.placementProspect.findUnique({ where: { cnpj: cnpjDigits } });
          if (dup && dup.id !== id) {
            return reply.status(409).send({
              error: 'CNPJ já cadastrado',
              message: `Já existe outro prospect com este CNPJ (${dup.razaoSocial}).`,
            });
          }
        }
        data.cnpj = cnpjDigits;
      }

      if (body.grupoEconomico !== undefined) {
        const ge = String(body.grupoEconomico ?? '').trim();
        data.grupoEconomico = ge || null;
      }

      if (body.cnae !== undefined) {
        const cnaeDigits = normalizeCnae(body.cnae);
        if (!isValidCnaeDigits(cnaeDigits)) {
          return reply.status(400).send({
            error: 'CNAE inválido',
            message: 'Informe o CNAE com 7 ou 8 dígitos (apenas números).',
          });
        }
        data.cnae = cnaeDigits;
      }

      const updated = await prisma.placementProspect.update({ where: { id }, data });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/prospects/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/prospects/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementProspect.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Prospect não encontrado' });

      // Bloquear exclusão se houver cotações vinculadas
      const linked = await prisma.placementCotacao.count({ where: { prospectId: id } });
      if (linked > 0) {
        return reply.status(409).send({
          error: 'Prospect em uso',
          message: `Existem ${linked} cotação(ões) vinculadas a este prospect. Reatribua-as antes de excluir.`,
        });
      }

      await prisma.placementProspect.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/prospects/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Condições (grupo econômico + razão social + CNAE) ----------------

  fastify.get('/placement/condicoes', async (_request, reply) => {
    try {
      const condicoes = await prisma.placementCondicao.findMany({
        orderBy: [{ grupoEconomico: 'asc' }, { razaoSocial: 'asc' }],
      });
      return { condicoes };
    } catch (error) {
      console.error('❌ GET /placement/condicoes:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/condicoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const row = await prisma.placementCondicao.findUnique({ where: { id } });
      if (!row) return reply.status(404).send({ error: 'Condição não encontrada' });
      return row;
    } catch (error) {
      console.error('❌ GET /placement/condicoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/condicoes', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        grupoEconomico?: string;
        razaoSocial?: string;
        cnae?: string;
        cnpj?: string;
      };

      const grupoEconomico = body.grupoEconomico ? String(body.grupoEconomico).trim() : null;
      const cnaeDigits = normalizeCnae(body.cnae);
      const cnpjDigits = onlyDigits(String(body.cnpj ?? ''));

      if (!cnpjDigits || cnpjDigits.length !== 14) {
        return reply.status(400).send({
          error: 'CNPJ obrigatório',
          message: 'Informe o CNPJ com 14 dígitos.',
        });
      }
      if (!isValidCnaeDigits(cnaeDigits)) {
        return reply.status(400).send({
          error: 'CNAE inválido',
          message: 'Informe o CNAE com 7 ou 8 dígitos (apenas números).',
        });
      }

      let razaoSocial = String(body.razaoSocial ?? '').trim();
      if (!razaoSocial) {
        const ext = await fetchBrasilCnpjEnrichment(cnpjDigits);
        if (ext.ok && ext.razaoSocial) {
          razaoSocial = ext.razaoSocial.trim();
        }
      }
      if (!razaoSocial) {
        return reply.status(400).send({
          error: 'Razão social não encontrada',
          message:
            'Use “Consultar CNPJ” no formulário até retornar a razão social, ou informe razão social no cadastro legado.',
        });
      }

      const dupCnpj = await prisma.placementCondicao.findUnique({ where: { cnpj: cnpjDigits } });
      if (dupCnpj) {
        return reply.status(409).send({
          error: 'CNPJ já cadastrado',
          message: `Já existe uma condição com este CNPJ (${dupCnpj.razaoSocial}).`,
        });
      }

      const created = await prisma.placementCondicao.create({
        data: {
          razaoSocial,
          grupoEconomico,
          cnae: cnaeDigits,
          cnpj: cnpjDigits,
        },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/condicoes:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/condicoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        grupoEconomico?: string;
        razaoSocial?: string;
        cnae?: string;
        cnpj?: string | null;
      };

      const existing = await prisma.placementCondicao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Condição não encontrada' });

      const data: Record<string, unknown> = {};

      if (body.razaoSocial !== undefined) {
        const razaoSocial = String(body.razaoSocial).trim();
        if (!razaoSocial) {
          return reply.status(400).send({ error: 'Razão social é obrigatória' });
        }
        data.razaoSocial = razaoSocial;
      }

      if (body.grupoEconomico !== undefined) {
        const ge = String(body.grupoEconomico ?? '').trim();
        data.grupoEconomico = ge || null;
      }

      if (body.cnae !== undefined) {
        const cnaeDigits = normalizeCnae(body.cnae);
        if (!isValidCnaeDigits(cnaeDigits)) {
          return reply.status(400).send({
            error: 'CNAE inválido',
            message: 'Informe o CNAE com 7 ou 8 dígitos (apenas números).',
          });
        }
        data.cnae = cnaeDigits;
      }

      if (body.cnpj !== undefined) {
        const raw = body.cnpj === null || body.cnpj === '' ? '' : onlyDigits(String(body.cnpj));
        if (raw && raw.length !== 14) {
          return reply.status(400).send({
            error: 'CNPJ inválido',
            message: 'Informe 14 dígitos ou deixe o CNPJ em branco.',
          });
        }
        const nextCnpj = raw.length === 14 ? raw : null;
        if (nextCnpj && nextCnpj !== existing.cnpj) {
          const dup = await prisma.placementCondicao.findUnique({ where: { cnpj: nextCnpj } });
          if (dup && dup.id !== id) {
            return reply.status(409).send({
              error: 'CNPJ já cadastrado',
              message: `Já existe outra condição com este CNPJ (${dup.razaoSocial}).`,
            });
          }
        }
        data.cnpj = nextCnpj;
      }

      const updated = await prisma.placementCondicao.update({ where: { id }, data });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/condicoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/condicoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementCondicao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Condição não encontrada' });

      const linked = await prisma.placementCotacao.count({ where: { condicaoId: id } });
      if (linked > 0) {
        return reply.status(409).send({
          error: 'Condição em uso',
          message: `Existem ${linked} cotação(ões) vinculadas a esta condição. Reatribua-as antes de excluir.`,
        });
      }

      await prisma.placementCondicao.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/condicoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Cotações (Fila) --------------------------------------------------

  /** Inclui analista, cliente e prospect para a Fila exibir o nome direto. */
  const cotacaoInclude = {
    analista: { select: { id: true, nome: true } },
    analistaResponsavel: {
      select: {
        id: true,
        nome: true,
        coordenadorAnalista: true,
        gerenteAnalista: true,
      },
    },
    cliente: { select: { id: true, nome: true, cnpj: true, grupoEconomico: true } },
    prospect: {
      select: { id: true, razaoSocial: true, cnpj: true, grupoEconomico: true, cnae: true },
    },
    condicao: {
      select: { id: true, grupoEconomico: true, razaoSocial: true, cnae: true, cnpj: true },
    },
    filial: { select: { id: true, razaoSocial: true, cnpj: true, status: true } },
    corretorParceiro: { select: { id: true, nome: true } },
    projeto: { select: { id: true, nome: true } },
    pedido: { select: { id: true, nome: true } },
    temperatura: { select: { id: true, nome: true } },
    tipoContratacao: { select: { id: true, nome: true } },
    modalidadeContrato: { select: { id: true, nome: true } },
    prazoVigenciaContrato: { select: { id: true, nome: true } },
    user: { select: { id: true, name: true, email: true } },
    _count: { select: { beneficiarios: true } },
  } as const;

  /** Payload enxuto para a grade da Fila — evita JSON grande (kickOff, mapeamento, planos). */
  const cotacaoFilaListSelect = {
    id: true,
    ticket: true,
    status: true,
    analistaId: true,
    clienteId: true,
    prospectId: true,
    condicaoId: true,
    filialId: true,
    corretorParceiroId: true,
    ramo: true,
    operadorasIds: true,
    vidas: true,
    valorEstimadoCents: true,
    dataLimite: true,
    updatedAt: true,
    createdAt: true,
    emCotacaoSubetapa: true,
    analista: { select: { id: true, nome: true } },
    cliente: { select: { id: true, nome: true, cnpj: true, grupoEconomico: true } },
    prospect: {
      select: { id: true, razaoSocial: true, cnpj: true, grupoEconomico: true, cnae: true },
    },
    condicao: {
      select: { id: true, grupoEconomico: true, razaoSocial: true, cnae: true, cnpj: true },
    },
    filial: { select: { id: true, razaoSocial: true, cnpj: true, status: true } },
    corretorParceiro: { select: { id: true, nome: true } },
  } as const;

  // ---- Beneficiários (Em cotação — etapa 1) ---------------------------

  fastify.get('/placement/cotacoes/:cotacaoId/beneficiarios', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string };
      const cot = await prisma.placementCotacao.findUnique({
        where: { id: cotacaoId },
        select: { id: true, emCotacaoSubetapa: true },
      });
      if (!cot) return reply.status(404).send({ error: 'Cotação não encontrada' });

      const beneficiarios = await prisma.placementCotacaoBeneficiario.findMany({
        where: { cotacaoId },
        orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      });
      return {
        emCotacaoSubetapa: cot.emCotacaoSubetapa ?? 'beneficiarios',
        total: beneficiarios.length,
        beneficiarios,
      };
    } catch (error) {
      console.error('❌ GET beneficiarios:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/cotacoes/:cotacaoId/beneficiarios/bulk', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string };
      const body = (request.body ?? {}) as { rows?: unknown[]; replace?: boolean };
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return reply.status(400).send({ error: 'Informe ao menos uma linha na planilha.' });
      }
      if (rows.length > MAX_BENEFICIARIOS_POR_COTACAO) {
        return reply.status(400).send({
          error: 'Limite excedido',
          message: `Máximo de ${MAX_BENEFICIARIOS_POR_COTACAO} beneficiários por cotação.`,
        });
      }

      const cot = await prisma.placementCotacao.findUnique({
        where: { id: cotacaoId },
        select: { id: true },
      });
      if (!cot) return reply.status(404).send({ error: 'Cotação não encontrada' });

      const parsed = rows
        .filter((r) => r && typeof r === 'object')
        .map((r) => parseBeneficiarioRowInput(r as Record<string, unknown>));

      const replace = body.replace !== false;

      const count = await prisma.$transaction(
        async (tx) => {
          if (replace) {
            await tx.placementCotacaoBeneficiario.deleteMany({ where: { cotacaoId } });
          }
          await insertBeneficiariosBatched(tx, cotacaoId, parsed);
          return tx.placementCotacaoBeneficiario.count({ where: { cotacaoId } });
        },
        { timeout: 120_000, maxWait: 15_000 }
      );

      await prisma.placementCotacao.update({
        where: { id: cotacaoId },
        data: { emCotacaoSubetapa: 'beneficiarios' },
      });

      return { total: count, imported: parsed.length, replace };
    } catch (error) {
      console.error('❌ POST beneficiarios/bulk:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: prismaErrorDetail(error) ?? 'Falha ao importar beneficiários.',
      });
    }
  });

  fastify.delete('/placement/cotacoes/:cotacaoId/beneficiarios', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string };
      const deleted = await prisma.placementCotacaoBeneficiario.deleteMany({
        where: { cotacaoId },
      });
      return { deleted: deleted.count };
    } catch (error) {
      console.error('❌ DELETE beneficiarios:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/cotacoes/:cotacaoId/em-cotacao-subetapa', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string };
      const body = (request.body ?? {}) as { subetapa?: string };
      const subetapa = normalizeEmCotacaoSubetapa(body.subetapa);

      const existing = await prisma.placementCotacao.findUnique({ where: { id: cotacaoId } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });

      if (subetapa === 'analise_base' || subetapa === 'etapa2' || subetapa === 'etapa3') {
        const total = await prisma.placementCotacaoBeneficiario.count({ where: { cotacaoId } });
        if (total < 1) {
          return reply.status(400).send({
            error: 'Base de beneficiários obrigatória',
            message: 'Importe a planilha de beneficiários antes de abrir a análise da base.',
          });
        }
      }

      const updated = await prisma.placementCotacao.update({
        where: { id: cotacaoId },
        data: { emCotacaoSubetapa: subetapa },
        select: cotacaoLightSelect,
      });
      return updated;
    } catch (error) {
      console.error('❌ PUT em-cotacao-subetapa:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // ---- Subfatura (empresas participantes) -----------------------------
  // Paths mais específicos que /placement/cotacoes/:id (sem segmento extra).

  fastify.get('/placement/cotacoes/:cotacaoId/subfaturas', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string };
      const cot = await prisma.placementCotacao.findUnique({
        where: { id: cotacaoId },
        select: { id: true },
      });
      if (!cot) return reply.status(404).send({ error: 'Cotação não encontrada' });
      const subfaturas = await prisma.placementSubfatura.findMany({
        where: { cotacaoId },
        orderBy: { razaoSocial: 'asc' },
      });
      return { subfaturas };
    } catch (error) {
      console.error('❌ GET /placement/cotacoes/:cotacaoId/subfaturas:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/cotacoes/:cotacaoId/subfaturas', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const cnpjDigits = onlyDigits(String(body.cnpj ?? ''));
      const razaoSocial = String(body.razaoSocial ?? '').trim();
      const cidade = body.cidade !== undefined ? String(body.cidade ?? '').trim() || null : null;
      const ufRaw = String(body.uf ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 2);
      const uf = ufRaw.length === 2 ? ufRaw : null;
      const vidas = toIntOrNull(body.vidas) ?? null;

      if (cnpjDigits.length !== 14) {
        return reply.status(400).send({ error: 'CNPJ inválido — informe os 14 dígitos' });
      }
      if (!razaoSocial) {
        return reply.status(400).send({ error: 'Razão social é obrigatória' });
      }

      const cot = await prisma.placementCotacao.findUnique({
        where: { id: cotacaoId },
        select: { id: true },
      });
      if (!cot) return reply.status(404).send({ error: 'Cotação não encontrada' });

      try {
        const created = await prisma.placementSubfatura.create({
          data: {
            cotacaoId,
            cnpj: cnpjDigits,
            razaoSocial,
            cidade,
            uf,
            vidas,
            anexos: [],
          },
        });
        return reply.status(201).send(created);
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === 'P2002') {
          return reply.status(409).send({
            error: 'CNPJ duplicado',
            message: 'Já existe uma subfatura com este CNPJ nesta cotação.',
          });
        }
        throw e;
      }
    } catch (error) {
      console.error('❌ POST /placement/cotacoes/:cotacaoId/subfaturas:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/subfaturas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const existing = await prisma.placementSubfatura.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Subfatura não encontrada' });

      const data: Record<string, unknown> = {};
      if (body.cnpj !== undefined) {
        const d = onlyDigits(String(body.cnpj));
        if (d.length !== 14) {
          return reply.status(400).send({ error: 'CNPJ inválido — informe os 14 dígitos' });
        }
        data.cnpj = d;
      }
      if (body.razaoSocial !== undefined) {
        const rs = String(body.razaoSocial ?? '').trim();
        if (!rs) {
          return reply.status(400).send({ error: 'Razão social é obrigatória' });
        }
        data.razaoSocial = rs;
      }
      if (body.cidade !== undefined) {
        const c = String(body.cidade ?? '').trim();
        data.cidade = c || null;
      }
      if (body.uf !== undefined) {
        const u = String(body.uf ?? '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 2);
        data.uf = u.length === 2 ? u : null;
      }
      if (body.vidas !== undefined) {
        data.vidas = toIntOrNull(body.vidas) ?? null;
      }

      try {
        const updated = await prisma.placementSubfatura.update({ where: { id }, data });
        return updated;
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === 'P2002') {
          return reply.status(409).send({
            error: 'CNPJ duplicado',
            message: 'Já existe outra subfatura com este CNPJ nesta cotação.',
          });
        }
        throw e;
      }
    } catch (error) {
      console.error('❌ PUT /placement/subfaturas/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/subfaturas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementSubfatura.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Subfatura não encontrada' });
      const anexos = parseSubfaturaAnexos(existing.anexos);
      await removeSubfaturaAnexoFiles(id, anexos);
      try {
        await fs.rm(subfaturaUploadDir(id), { recursive: true, force: true });
      } catch {
        /* pasta inexistente */
      }
      await prisma.placementSubfatura.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/subfaturas/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/subfaturas/:id/anexos', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const sub = await prisma.placementSubfatura.findUnique({ where: { id } });
      if (!sub) return reply.status(404).send({ error: 'Subfatura não encontrada' });

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({
          error: 'Arquivo obrigatório',
          message: 'Envie multipart/form-data com o campo de arquivo nomeado "file".',
        });
      }
      const buf = await file.toBuffer();
      const original = (file.filename || 'documento')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .slice(0, 180);
      const storedName = `${randomUUID()}_${original || 'documento'}`;
      const dir = subfaturaUploadDir(id);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, storedName), buf);

      const anexos = parseSubfaturaAnexos(sub.anexos);
      const novo: SubfaturaAnexo = {
        id: randomUUID(),
        nomeOriginal: original || 'documento',
        storedName,
        mimeType: file.mimetype || 'application/octet-stream',
        size: buf.length,
      };
      const next = [...anexos, novo];
      const updated = await prisma.placementSubfatura.update({
        where: { id },
        data: { anexos: next as any },
      });
      return reply.status(201).send({ subfatura: updated, anexo: novo });
    } catch (error) {
      console.error('❌ POST /placement/subfaturas/:id/anexos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/subfaturas/:id/anexos/:anexoId', async (request, reply) => {
    try {
      const { id, anexoId } = request.params as { id: string; anexoId: string };
      const sub = await prisma.placementSubfatura.findUnique({ where: { id } });
      if (!sub) return reply.status(404).send({ error: 'Subfatura não encontrada' });
      const anexos = parseSubfaturaAnexos(sub.anexos);
      const hit = anexos.find((a) => a.id === anexoId);
      if (!hit) return reply.status(404).send({ error: 'Anexo não encontrado' });
      try {
        await fs.unlink(path.join(subfaturaUploadDir(id), hit.storedName));
      } catch {
        /* */
      }
      const next = anexos.filter((a) => a.id !== anexoId);
      await prisma.placementSubfatura.update({
        where: { id },
        data: { anexos: next as any },
      });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE anexo:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/subfaturas/:id/anexos/:anexoId/download', async (request, reply) => {
    try {
      const { id, anexoId } = request.params as { id: string; anexoId: string };
      const sub = await prisma.placementSubfatura.findUnique({ where: { id } });
      if (!sub) return reply.status(404).send({ error: 'Subfatura não encontrada' });
      const anexos = parseSubfaturaAnexos(sub.anexos);
      const hit = anexos.find((a) => a.id === anexoId);
      if (!hit) return reply.status(404).send({ error: 'Anexo não encontrado' });
      const full = path.join(subfaturaUploadDir(id), hit.storedName);
      try {
        await fs.access(full);
      } catch {
        return reply.status(404).send({ error: 'Arquivo não encontrado no servidor' });
      }
      reply.header('Content-Type', hit.mimeType || 'application/octet-stream');
      const ascii = hit.nomeOriginal.replace(/[^\x20-\x7E]/g, '_');
      reply.header('Content-Disposition', `attachment; filename="${ascii}"`);
      return reply.send(createReadStream(full));
    } catch (error) {
      console.error('❌ GET download anexo:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/cotacoes', async (request, reply) => {
    try {
      const q = (request.query ?? {}) as { scope?: string; userId?: string };
      const scope = String(q.scope ?? 'fila').trim().toLowerCase();
      const where: Record<string, unknown> = {};
      if (scope === 'fila' || scope === '') {
        where.status = { not: PLACEMENT_STATUS_RASCUNHO };
      } else if (scope === 'rascunhos') {
        where.status = PLACEMENT_STATUS_RASCUNHO;
        if (q.userId) where.userId = String(q.userId);
      }
      const cotacoes = await prisma.placementCotacao.findMany({
        where: Object.keys(where).length ? where : undefined,
        select: cotacaoFilaListSelect,
        orderBy: { updatedAt: 'desc' },
      });
      return { cotacoes };
    } catch (error) {
      console.error('❌ GET /placement/cotacoes:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/cotacoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const cotacao = await prisma.placementCotacao.findUnique({
        where: { id },
        include: cotacaoInclude,
      });
      if (!cotacao) return reply.status(404).send({ error: 'Cotação não encontrada' });
      return cotacao;
    } catch (error) {
      console.error('❌ GET /placement/cotacoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/cotacoes', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;

      const descricao = body.descricao !== undefined ? String(body.descricao ?? '').trim() : '';
      const ramo = body.ramo !== undefined ? String(body.ramo ?? '').trim() : '';
      const observacoes = body.observacoes !== undefined ? String(body.observacoes ?? '').trim() : '';
      const ticketInput = body.ticket !== undefined ? String(body.ticket ?? '').trim() : '';
      const statusRaw = String(body.status ?? '').trim();
      const isDraft = statusRaw.toLowerCase() === PLACEMENT_STATUS_RASCUNHO.toLowerCase();
      const status: CotacaoStatus = isDraft
        ? PLACEMENT_STATUS_RASCUNHO
        : normalizeCotacaoStatus(body.status);

      const analistaId = body.analistaId ? String(body.analistaId) : null;
      const analistaResponsavelIdBody = parseOptionalId(body.analistaResponsavelId);
      if (analistaResponsavelIdBody) {
        const pa = await prisma.placementAnalista.findUnique({
          where: { id: analistaResponsavelIdBody },
        });
        if (!pa) return reply.status(404).send({ error: 'Analista responsável não encontrado' });
      }
      let clienteId = body.clienteId ? String(body.clienteId) : null;
      const prospectId = body.prospectId ? String(body.prospectId) : null;
      const condicaoId = body.condicaoId ? String(body.condicaoId) : null;
      const userId = body.userId ? String(body.userId) : null;
      const filialIdBody = parseOptionalId(body.filialId);
      const corretorParceiroIdBody = parseOptionalId(body.corretorParceiroId);
      const projetoIdBody = parseOptionalId(body.projetoId);
      const pedidoIdBody = parseOptionalId(body.pedidoId);
      const temperaturaIdBody = parseOptionalId(body.temperaturaId);
      const solicitanteBody =
        body.solicitante !== undefined ? String(body.solicitante ?? '').trim() || null : null;

      if (isDraft && !userId) {
        return reply.status(400).send({
          error: 'Usuário obrigatório',
          message: 'Rascunhos devem estar vinculados ao usuário que os iniciou.',
        });
      }

      if (!isDraft) {
        if (clienteId && prospectId) {
          return reply.status(400).send({
            error: 'Informe apenas Cliente OU Prospect na mesma cotação',
          });
        }

        if (prospectId && condicaoId) {
          return reply.status(400).send({
            error: 'Condição não aplicável',
            message:
              'Condições (CNAE) são usadas apenas com cliente da casa. Para prospect, o CNAE fica no cadastro do prospect.',
          });
        }

        if (!prospectId && !condicaoId && !clienteId) {
          return reply.status(400).send({
            error: 'Estipulante obrigatório',
            message:
              'Informe o estipulante: para cliente da casa, selecione uma condição em Dados → Placement → Condições; para prospect, selecione o prospect no mapeamento.',
          });
        }

        /** Casa: condição Placement define estipulante (razão + CNPJ + CNAE). Cliente master é opcional. */
        if (clienteId) {
          if (!condicaoId) {
            return reply.status(400).send({
              error: 'Condição obrigatória',
              message:
                'Para cliente da casa, selecione ou cadastre uma condição em Dados → Placement → Condições (grupo econômico, razão social e CNAE).',
            });
          }
          const cond = await prisma.placementCondicao.findUnique({ where: { id: condicaoId } });
          if (!cond) {
            return reply.status(404).send({ error: 'Condição não encontrada' });
          }
          const cli = await prisma.cliente.findUnique({ where: { id: clienteId } });
          if (!cli) {
            return reply.status(404).send({ error: 'Cliente não encontrado' });
          }
          if (
            cond.grupoEconomico &&
            cli.grupoEconomico &&
            cond.grupoEconomico !== cli.grupoEconomico
          ) {
            return reply.status(400).send({
              error: 'Condição incompatível',
              message:
                'O grupo econômico da condição não confere com o grupo econômico do cliente selecionado.',
            });
          }
        } else if (!prospectId && condicaoId) {
          const cond = await prisma.placementCondicao.findUnique({ where: { id: condicaoId } });
          if (!cond) {
            return reply.status(404).send({ error: 'Condição não encontrada' });
          }
          if (!clienteId) {
            const resolved = await resolveClienteIdFromCondicaoCnpj(condicaoId);
            if (resolved) clienteId = resolved;
          }
        }

        if (clienteId || prospectId || (!prospectId && condicaoId)) {
          if (!filialIdBody) {
            return reply.status(400).send({
              error: 'Filial obrigatória',
              message: 'Selecione a filial cadastrada em Dados → Placement → Filial.',
            });
          }
          const filOk = await prisma.placementFilial.findUnique({ where: { id: filialIdBody } });
          if (!filOk) {
            return reply.status(404).send({ error: 'Filial não encontrada' });
          }
        }
      } else if (clienteId && prospectId) {
        return reply.status(400).send({
          error: 'Informe apenas Cliente OU Prospect na mesma cotação',
        });
      }

      if (corretorParceiroIdBody) {
        const cpOk = await prisma.placementCorretorParceiro.findUnique({
          where: { id: corretorParceiroIdBody },
        });
        if (!cpOk) {
          return reply.status(404).send({ error: 'Corretor parceiro não encontrado' });
        }
      }

      if (projetoIdBody) {
        const prOk = await prisma.placementProjeto.findUnique({ where: { id: projetoIdBody } });
        if (!prOk) return reply.status(404).send({ error: 'Projeto não encontrado' });
      }
      if (pedidoIdBody) {
        const peOk = await prisma.placementPedido.findUnique({ where: { id: pedidoIdBody } });
        if (!peOk) return reply.status(404).send({ error: 'Tipo de pedido/conta não encontrado' });
      }
      if (temperaturaIdBody) {
        const teOk = await prisma.placementTemperatura.findUnique({ where: { id: temperaturaIdBody } });
        if (!teOk) return reply.status(404).send({ error: 'Temperatura não encontrada' });
      }

      const tipoContratacaoIdBody = parseOptionalId(body.tipoContratacaoId);
      const modalidadeContratoIdBody = parseOptionalId(body.modalidadeContratoId);
      const prazoVigenciaContratoIdBody = parseOptionalId(body.prazoVigenciaContratoId);
      const vigenciaApoliceBody = toDateOrNull(body.vigenciaApolice);
      const breakEvenBody =
        body.breakEven !== undefined ? String(body.breakEven ?? '').trim() || null : null;
      const formularioTipoBody =
        body.formularioTipo !== undefined ? parseFormularioTipo(body.formularioTipo) ?? null : null;
      const multaRescisaoContratualBody =
        body.multaRescisaoContratual !== undefined
          ? parsePermiteUpgradeDowngrade(body.multaRescisaoContratual) ?? null
          : null;
      const multaRescisaoValorBody =
        multaRescisaoContratualBody === true
          ? String(body.multaRescisaoValor ?? '').trim() || null
          : null;
      const multaRescisaoRegraBody =
        multaRescisaoContratualBody === true
          ? String(body.multaRescisaoRegra ?? '').trim() || null
          : null;
      const multaRescisaoAvisoPrevioBody =
        multaRescisaoContratualBody === true
          ? String(body.multaRescisaoAvisoPrevio ?? '').trim() || null
          : null;
      const possuiConvencaoColetivaBody =
        body.possuiConvencaoColetiva !== undefined
          ? parsePermiteUpgradeDowngrade(body.possuiConvencaoColetiva) ?? null
          : null;
      const convencaoColetivaDetalheBody =
        possuiConvencaoColetivaBody === true
          ? String(body.convencaoColetivaDetalhe ?? '').trim() || null
          : null;
      const permiteUpgradeBody = parsePermiteUpgradeDowngrade(body.permiteUpgrade);
      const permiteDowngradeBody = parsePermiteUpgradeDowngrade(body.permiteDowngrade);
      const regraUpgradeBody =
        body.regraUpgrade !== undefined ? String(body.regraUpgrade ?? '').trim() || null : null;
      const regraDowngradeBody =
        body.regraDowngrade !== undefined ? String(body.regraDowngrade ?? '').trim() || null : null;
      const legadoPermite = parsePermiteUpgradeDowngrade(body.permiteUpgradeDowngrade);
      const legadoRegra =
        body.regraUpgradeDowngrade !== undefined
          ? String(body.regraUpgradeDowngrade ?? '').trim() || null
          : null;

      if (tipoContratacaoIdBody) {
        const t = await prisma.placementTipoContratacao.findUnique({ where: { id: tipoContratacaoIdBody } });
        if (!t) return reply.status(404).send({ error: 'Tipo de contratação não encontrado' });
      }
      if (modalidadeContratoIdBody) {
        const m = await prisma.placementModalidadeContrato.findUnique({ where: { id: modalidadeContratoIdBody } });
        if (!m) return reply.status(404).send({ error: 'Modalidade de contrato não encontrada' });
      }
      if (prazoVigenciaContratoIdBody) {
        const p = await prisma.placementPrazoVigenciaContrato.findUnique({
          where: { id: prazoVigenciaContratoIdBody },
        });
        if (!p) return reply.status(404).send({ error: 'Prazo de vigência do contrato não encontrado' });
      }

      const operadorasIds = toOperadorasArray(body.operadorasIds) ?? null;
      const operadorasSugestaoIds = toOperadorasArray(body.operadorasSugestaoIds) ?? null;
      const vidas = toIntOrNull(body.vidas) ?? null;
      const valorEstimadoCents = toIntOrNull(body.valorEstimadoCents) ?? null;
      const dataInicio = toDateOrNull(body.dataInicio) ?? null;
      const dataLimite = toDateOrNull(body.dataLimite) ?? null;

      const itensParsed = parseItensMapeamentoBody(body.itensMapeamento);
      const planosParsed = parsePlanosCoberturaBody(body.planosCobertura);

      let ramoData = ramo || null;
      let operadorasData = operadorasIds;
      let itensMapeamento: ItemMapeamentoInput[] | undefined;
      let planosCobertura: unknown[] | Record<string, unknown> | null | undefined;

      if (itensParsed !== null && itensParsed.length > 0) {
        itensMapeamento = itensParsed;
        ramoData = deriveRamoFromItens(itensParsed);
        operadorasData = deriveOperadorasFromItens(itensParsed);
      }

      if (planosParsed !== undefined) {
        planosCobertura = planosParsed;
      }

      let ticket = ticketInput;
      if (!ticket) {
        ticket = await generateCotacaoTicket(prisma);
      } else {
        const exists = await prisma.placementCotacao.findUnique({ where: { ticket } });
        if (exists) {
          return reply.status(409).send({
            error: 'Ticket já cadastrado',
            message: `Já existe uma cotação com o ticket ${ticket}.`,
          });
        }
      }

      const created = await prisma.placementCotacao.create({
        data: {
          ticket,
          status,
          analistaId,
          analistaResponsavelId: analistaResponsavelIdBody,
          clienteId,
          prospectId,
          condicaoId: prospectId ? null : condicaoId ? String(condicaoId) : null,
          filialId: filialIdBody,
          corretorParceiroId: corretorParceiroIdBody,
          projetoId: projetoIdBody,
          pedidoId: pedidoIdBody,
          solicitante: solicitanteBody,
          temperaturaId: temperaturaIdBody,
          vigenciaApolice: vigenciaApoliceBody ?? null,
          tipoContratacaoId: tipoContratacaoIdBody,
          modalidadeContratoId: modalidadeContratoIdBody,
          prazoVigenciaContratoId: prazoVigenciaContratoIdBody,
          breakEven: breakEvenBody,
          formularioTipo: formularioTipoBody,
          multaRescisaoContratual: multaRescisaoContratualBody,
          multaRescisaoValor: multaRescisaoValorBody,
          multaRescisaoRegra: multaRescisaoRegraBody,
          multaRescisaoAvisoPrevio: multaRescisaoAvisoPrevioBody,
          possuiConvencaoColetiva: possuiConvencaoColetivaBody,
          convencaoColetivaDetalhe: convencaoColetivaDetalheBody,
          permiteUpgrade:
            permiteUpgradeBody ?? (legadoPermite !== undefined ? legadoPermite : null),
          regraUpgrade:
            (permiteUpgradeBody ?? legadoPermite) === true
              ? regraUpgradeBody ?? legadoRegra
              : null,
          permiteDowngrade:
            permiteDowngradeBody ?? (legadoPermite !== undefined ? legadoPermite : null),
          regraDowngrade:
            (permiteDowngradeBody ?? legadoPermite) === true
              ? regraDowngradeBody ?? legadoRegra
              : null,
          permiteUpgradeDowngrade: null,
          regraUpgradeDowngrade: null,
          userId,
          ramo: ramoData,
          operadorasIds: operadorasData as any,
          operadorasSugestaoIds: operadorasSugestaoIds as any,
          itensMapeamento: itensMapeamento !== undefined ? (itensMapeamento as any) : undefined,
          planosCobertura:
            planosCobertura !== undefined ? (planosCobertura as any) : undefined,
          vidas,
          valorEstimadoCents,
          dataInicio,
          dataLimite,
          descricao: descricao || null,
          observacoes: observacoes || null,
        },
        include: cotacaoInclude,
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/cotacoes:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/cotacoes/:id/iniciar-processo', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;

      const existing = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });
      if (!isRascunhoStatusApi(existing.status)) {
        return reply.status(400).send({
          error: 'Apenas rascunhos',
          message: 'Somente cotações em rascunho podem iniciar o processo na fila.',
        });
      }

      const requestUserId = body.userId ? String(body.userId) : null;
      if (requestUserId && existing.userId && requestUserId !== existing.userId) {
        return reply.status(403).send({
          error: 'Rascunho de outro usuário',
          message: 'Este rascunho pertence a outro usuário.',
        });
      }

      let clienteId =
        body.clienteId !== undefined
          ? body.clienteId
            ? String(body.clienteId)
            : null
          : existing.clienteId;
      const prospectId =
        body.prospectId !== undefined
          ? body.prospectId
            ? String(body.prospectId)
            : null
          : existing.prospectId;
      let condicaoId =
        body.condicaoId !== undefined
          ? body.condicaoId
            ? String(body.condicaoId)
            : null
          : existing.condicaoId;
      const filialId =
        body.filialId !== undefined ? parseOptionalId(body.filialId) : existing.filialId;

      if (clienteId && prospectId) {
        return reply.status(400).send({
          error: 'Informe apenas Cliente OU Prospect na mesma cotação',
        });
      }
      if (prospectId && condicaoId) {
        return reply.status(400).send({
          error: 'Condição não aplicável',
          message:
            'Condições (CNAE) são usadas apenas com cliente da casa. Para prospect, o CNAE fica no cadastro do prospect.',
        });
      }
      if (!prospectId && !condicaoId && !clienteId) {
        return reply.status(400).send({
          error: 'Estipulante obrigatório',
          message:
            'Informe o estipulante antes de iniciar o processo: condição (casa) ou prospect.',
        });
      }
      if (clienteId && !condicaoId) {
        return reply.status(400).send({
          error: 'Condição obrigatória',
          message: 'Para cliente da casa, selecione a condição em Dados → Placement → Condições.',
        });
      }
      if (!prospectId && condicaoId && !clienteId) {
        const resolved = await resolveClienteIdFromCondicaoCnpj(condicaoId);
        if (resolved) clienteId = resolved;
      }
      if ((clienteId || prospectId || condicaoId) && !filialId) {
        return reply.status(400).send({
          error: 'Filial obrigatória',
          message: 'Selecione a filial antes de iniciar o processo.',
        });
      }

      const dataInicio =
        body.dataInicio !== undefined ? toDateOrNull(body.dataInicio) : existing.dataInicio;
      if (!dataInicio) {
        return reply.status(400).send({
          error: 'Data de início obrigatória',
          message: 'Informe a data de início (Prazos) antes de iniciar o processo.',
        });
      }

      const updatePayload: Record<string, unknown> = { status: 'Aberta' };
      if (body.analistaId !== undefined) {
        updatePayload.analistaId = body.analistaId ? String(body.analistaId) : null;
      }
      if (body.clienteId !== undefined) updatePayload.clienteId = clienteId;
      if (body.prospectId !== undefined) updatePayload.prospectId = prospectId;
      if (body.condicaoId !== undefined) {
        updatePayload.condicaoId = prospectId ? null : condicaoId;
      } else if (prospectId) {
        updatePayload.condicaoId = null;
      }
      if (body.filialId !== undefined) updatePayload.filialId = filialId;
      if (body.dataInicio !== undefined) updatePayload.dataInicio = dataInicio;
      if (body.dataLimite !== undefined) updatePayload.dataLimite = toDateOrNull(body.dataLimite);
      if (body.itensMapeamento !== undefined) {
        const parsed = parseItensMapeamentoBody(body.itensMapeamento);
        if (parsed !== null && parsed.length > 0) {
          updatePayload.itensMapeamento = parsed as any;
          updatePayload.ramo = deriveRamoFromItens(parsed);
          updatePayload.operadorasIds = (deriveOperadorasFromItens(parsed) ?? null) as any;
        }
      }
      if (body.planosCobertura !== undefined) {
        const p = parsePlanosCoberturaBody(body.planosCobertura);
        if (p !== undefined) updatePayload.planosCobertura = p as any;
      }
      if (body.descricao !== undefined) {
        updatePayload.descricao = String(body.descricao ?? '').trim() || null;
      }
      if (body.observacoes !== undefined) {
        updatePayload.observacoes = String(body.observacoes ?? '').trim() || null;
      }
      const operadorasSugestaoIniciar = toOperadorasArray(body.operadorasSugestaoIds);
      if (operadorasSugestaoIniciar !== undefined) {
        updatePayload.operadorasSugestaoIds = operadorasSugestaoIniciar as any;
      }

      const updated = await prisma.placementCotacao.update({
        where: { id },
        data: updatePayload,
        include: cotacaoInclude,
      });
      return updated;
    } catch (error) {
      console.error('❌ POST /placement/cotacoes/:id/iniciar-processo:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.patch('/placement/cotacoes/:id/workflow-status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        status?: string;
        discard?: { kickOffEstrategia?: boolean; emCotacaoSubetapa?: boolean };
      };

      const existing = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });

      const nextStatus = resolveCotacaoStatusUpdate(body.status);
      if (!nextStatus) {
        return reply.status(400).send({
          error: 'Status inválido',
          message: `O status «${String(body.status ?? '').trim()}» não é reconhecido pela API.`,
        });
      }

      const validation = await validateWorkflowStatusTransition(prisma, existing, nextStatus);
      if (validation.ok === false) {
        return reply.status(validation.status).send({
          error: validation.error,
          message: validation.message,
        });
      }

      const data: Record<string, unknown> = { status: nextStatus };
      if (body.discard?.kickOffEstrategia) {
        data.kickOffEstrategia = null;
      }
      if (body.discard?.emCotacaoSubetapa) {
        data.emCotacaoSubetapa = 'beneficiarios';
      }

      const updated = await prisma.placementCotacao.update({
        where: { id },
        data,
        select: cotacaoLightSelect,
      });
      return updated;
    } catch (error) {
      console.error('❌ PATCH workflow-status:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/cotacoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;

      const existing = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });

      const effStatus =
        body.status !== undefined ? normalizeCotacaoStatus(body.status) : existing.status;
      const isDraft = isRascunhoStatusApi(effStatus);

      const data: Record<string, unknown> = {};

      if (body.ticket !== undefined) {
        const ticket = String(body.ticket ?? '').trim();
        if (!ticket) {
          return reply.status(400).send({ error: 'Ticket inválido' });
        }
        if (ticket !== existing.ticket) {
          const dup = await prisma.placementCotacao.findUnique({ where: { ticket } });
          if (dup && dup.id !== id) {
            return reply.status(409).send({
              error: 'Ticket já cadastrado',
              message: `Já existe outra cotação com o ticket ${ticket}.`,
            });
          }
        }
        data.ticket = ticket;
      }

      if (body.status !== undefined) {
        const nextStatus = resolveCotacaoStatusUpdate(body.status);
        if (!nextStatus) {
          return reply.status(400).send({
            error: 'Status inválido',
            message: `O status «${String(body.status ?? '').trim()}» não é reconhecido pela API.`,
          });
        }
        const curStatus = normalizeCotacaoStatus(existing.status);
        if (
          curStatus.toLowerCase() === 'aberta' &&
          nextStatus.toLowerCase() === 'kick off'
        ) {
          const effResp =
            body.analistaResponsavelId !== undefined
              ? parseOptionalId(body.analistaResponsavelId)
              : existing.analistaResponsavelId;
          if (!effResp) {
            return reply.status(400).send({
              error: 'Analista responsável obrigatório',
              message:
                'Designe o analista responsável (Dados → Placement → Analista) antes de avançar para Kick off.',
            });
          }
        }
        if (
          curStatus.toLowerCase() === 'estratégia' &&
          nextStatus.toLowerCase() === 'em cotação'
        ) {
          const effKick =
            body.kickOffEstrategia !== undefined
              ? parseKickOffEstrategiaBody(body.kickOffEstrategia)
              : parseKickOffEstrategiaBody(existing.kickOffEstrategia);
          if (!kickOffEstrategiaIsComplete(effKick)) {
            return reply.status(400).send({
              error: 'Estratégia incompleta',
              message:
                'Preencha a estratégia (itens e mercado analisado) antes de avançar para Solicitação Mercado.',
            });
          }
        }
        data.status = nextStatus;
      }
      if (body.analistaId !== undefined) data.analistaId = body.analistaId ? String(body.analistaId) : null;
      if (body.analistaResponsavelId !== undefined) {
        const parsed = parseOptionalId(body.analistaResponsavelId);
        if (parsed) {
          const pa = await prisma.placementAnalista.findUnique({ where: { id: parsed } });
          if (!pa) return reply.status(404).send({ error: 'Analista responsável não encontrado' });
        }
        data.analistaResponsavelId = parsed;
      }
      if (body.clienteId !== undefined) data.clienteId = body.clienteId ? String(body.clienteId) : null;
      if (body.prospectId !== undefined) data.prospectId = body.prospectId ? String(body.prospectId) : null;
      if (body.condicaoId !== undefined) {
        data.condicaoId = body.condicaoId ? String(body.condicaoId) : null;
      }
      if (body.userId !== undefined) data.userId = body.userId ? String(body.userId) : null;
      if (body.ramo !== undefined) data.ramo = String(body.ramo ?? '').trim() || null;

      if (body.itensMapeamento !== undefined) {
        const parsed = parseItensMapeamentoBody(body.itensMapeamento);
        if (parsed !== null) {
          if (parsed.length === 0) {
            data.itensMapeamento = null;
            data.ramo = null;
            data.operadorasIds = null;
          } else {
            data.itensMapeamento = parsed as any;
            data.ramo = deriveRamoFromItens(parsed);
            data.operadorasIds = (deriveOperadorasFromItens(parsed) ?? null) as any;
          }
        }
      }

      if (body.planosCobertura !== undefined) {
        const p = parsePlanosCoberturaBody(body.planosCobertura);
        if (p === undefined) {
          /* skip */
        } else if (p === null) {
          data.planosCobertura = null;
        } else {
          data.planosCobertura = p as any;
        }
      }

      const effCliente =
        body.clienteId !== undefined
          ? body.clienteId
            ? String(body.clienteId)
            : null
          : existing.clienteId;
      const effProspect =
        body.prospectId !== undefined
          ? body.prospectId
            ? String(body.prospectId)
            : null
          : existing.prospectId;

      if (effCliente && effProspect) {
        return reply.status(400).send({
          error: 'Informe apenas Cliente OU Prospect na mesma cotação',
        });
      }

      if (effProspect) {
        data.condicaoId = null;
      } else if (effCliente && !isDraft) {
        if (
          body.clienteId !== undefined &&
          body.clienteId &&
          String(body.clienteId) !== existing.clienteId &&
          body.condicaoId === undefined
        ) {
          return reply.status(400).send({
            error: 'Condição obrigatória',
            message: 'Ao trocar o cliente da casa, selecione a condição (grupo, razão social e CNAE) correspondente.',
          });
        }

        const effCondicao =
          body.condicaoId !== undefined
            ? body.condicaoId
              ? String(body.condicaoId)
              : null
            : existing.condicaoId;

        if (!effCondicao) {
          return reply.status(400).send({
            error: 'Condição obrigatória',
            message:
              'Para cliente da casa, selecione ou cadastre uma condição em Dados → Placement → Condições.',
          });
        }

        const cond = await prisma.placementCondicao.findUnique({ where: { id: effCondicao } });
        if (!cond) {
          return reply.status(404).send({ error: 'Condição não encontrada' });
        }
        const cli = await prisma.cliente.findUnique({ where: { id: effCliente } });
        if (!cli) {
          return reply.status(404).send({ error: 'Cliente não encontrado' });
        }
        if (
          cond.grupoEconomico &&
          cli.grupoEconomico &&
          cond.grupoEconomico !== cli.grupoEconomico
        ) {
          return reply.status(400).send({
            error: 'Condição incompatível',
            message:
              'O grupo econômico da condição não confere com o grupo econômico do cliente selecionado.',
          });
        }
        data.condicaoId = effCondicao;
      } else {
        /** Casa sem FK Cliente: estipulante vem só da condição Placement. */
        const effCondicaoSolo =
          body.condicaoId !== undefined
            ? body.condicaoId
              ? String(body.condicaoId)
              : null
            : existing.condicaoId;
        if (effCondicaoSolo) {
          const cond = await prisma.placementCondicao.findUnique({ where: { id: effCondicaoSolo } });
          if (!cond) {
            return reply.status(404).send({ error: 'Condição não encontrada' });
          }
          data.condicaoId = effCondicaoSolo;
          if (!effCliente && body.clienteId === undefined) {
            const resolved = await resolveClienteIdFromCondicaoCnpj(effCondicaoSolo);
            if (resolved) data.clienteId = resolved;
          }
        } else {
          data.condicaoId = null;
        }
      }
      if (body.descricao !== undefined) data.descricao = String(body.descricao ?? '').trim() || null;
      if (body.observacoes !== undefined) data.observacoes = String(body.observacoes ?? '').trim() || null;
      if (body.emCotacaoSubetapa !== undefined) {
        data.emCotacaoSubetapa = normalizeEmCotacaoSubetapa(body.emCotacaoSubetapa);
      }
      if (body.kickOffEstrategia !== undefined) {
        const parsed = parseKickOffEstrategiaBody(body.kickOffEstrategia);
        const merged = mergeKickOffEstrategiaPayload(existing.kickOffEstrategia, parsed);
        data.kickOffEstrategia = merged === null ? null : (merged as any);
      }

      const operadoras = toOperadorasArray(body.operadorasIds);
      if (operadoras !== undefined) data.operadorasIds = operadoras as any;
      const operadorasSugestao = toOperadorasArray(body.operadorasSugestaoIds);
      if (operadorasSugestao !== undefined) data.operadorasSugestaoIds = operadorasSugestao as any;

      const vidas = toIntOrNull(body.vidas);
      if (vidas !== undefined) data.vidas = vidas;

      const valor = toIntOrNull(body.valorEstimadoCents);
      if (valor !== undefined) data.valorEstimadoCents = valor;

      const dataInicio = toDateOrNull(body.dataInicio);
      if (dataInicio !== undefined) data.dataInicio = dataInicio;

      const dataLimite = toDateOrNull(body.dataLimite);
      if (dataLimite !== undefined) data.dataLimite = dataLimite;

      if (body.vigenciaApolice !== undefined) {
        data.vigenciaApolice = toDateOrNull(body.vigenciaApolice);
      }

      if (body.tipoContratacaoId !== undefined) {
        const parsed = parseOptionalId(body.tipoContratacaoId);
        if (parsed) {
          const t = await prisma.placementTipoContratacao.findUnique({ where: { id: parsed } });
          if (!t) return reply.status(404).send({ error: 'Tipo de contratação não encontrado' });
        }
        data.tipoContratacaoId = parsed;
      }
      if (body.modalidadeContratoId !== undefined) {
        const parsed = parseOptionalId(body.modalidadeContratoId);
        if (parsed) {
          const m = await prisma.placementModalidadeContrato.findUnique({ where: { id: parsed } });
          if (!m) return reply.status(404).send({ error: 'Modalidade de contrato não encontrada' });
        }
        data.modalidadeContratoId = parsed;
      }
      if (body.prazoVigenciaContratoId !== undefined) {
        const parsed = parseOptionalId(body.prazoVigenciaContratoId);
        if (parsed) {
          const p = await prisma.placementPrazoVigenciaContrato.findUnique({ where: { id: parsed } });
          if (!p) return reply.status(404).send({ error: 'Prazo de vigência do contrato não encontrado' });
        }
        data.prazoVigenciaContratoId = parsed;
      }
      if (body.breakEven !== undefined) {
        data.breakEven = String(body.breakEven ?? '').trim() || null;
      }
      if (body.formularioTipo !== undefined) {
        data.formularioTipo = parseFormularioTipo(body.formularioTipo) ?? null;
      }
      if (body.multaRescisaoContratual !== undefined) {
        const parsed = parsePermiteUpgradeDowngrade(body.multaRescisaoContratual);
        data.multaRescisaoContratual = parsed ?? null;
        if (parsed !== true) {
          data.multaRescisaoValor = null;
          data.multaRescisaoRegra = null;
          data.multaRescisaoAvisoPrevio = null;
        } else {
          if (body.multaRescisaoValor !== undefined) {
            data.multaRescisaoValor = String(body.multaRescisaoValor ?? '').trim() || null;
          }
          if (body.multaRescisaoRegra !== undefined) {
            data.multaRescisaoRegra = String(body.multaRescisaoRegra ?? '').trim() || null;
          }
          if (body.multaRescisaoAvisoPrevio !== undefined) {
            data.multaRescisaoAvisoPrevio =
              String(body.multaRescisaoAvisoPrevio ?? '').trim() || null;
          }
        }
      } else {
        if (body.multaRescisaoValor !== undefined) {
          data.multaRescisaoValor = String(body.multaRescisaoValor ?? '').trim() || null;
        }
        if (body.multaRescisaoRegra !== undefined) {
          data.multaRescisaoRegra = String(body.multaRescisaoRegra ?? '').trim() || null;
        }
        if (body.multaRescisaoAvisoPrevio !== undefined) {
          data.multaRescisaoAvisoPrevio =
            String(body.multaRescisaoAvisoPrevio ?? '').trim() || null;
        }
      }
      if (body.possuiConvencaoColetiva !== undefined) {
        const parsed = parsePermiteUpgradeDowngrade(body.possuiConvencaoColetiva);
        data.possuiConvencaoColetiva = parsed ?? null;
        if (parsed !== true) {
          data.convencaoColetivaDetalhe = null;
        } else if (body.convencaoColetivaDetalhe !== undefined) {
          data.convencaoColetivaDetalhe =
            String(body.convencaoColetivaDetalhe ?? '').trim() || null;
        }
      } else if (body.convencaoColetivaDetalhe !== undefined) {
        data.convencaoColetivaDetalhe =
          String(body.convencaoColetivaDetalhe ?? '').trim() || null;
      }
      if (body.permiteUpgrade !== undefined) {
        const parsed = parsePermiteUpgradeDowngrade(body.permiteUpgrade);
        data.permiteUpgrade = parsed ?? null;
        if (parsed !== true) data.regraUpgrade = null;
        else if (body.regraUpgrade !== undefined) {
          data.regraUpgrade = String(body.regraUpgrade ?? '').trim() || null;
        }
      } else if (body.regraUpgrade !== undefined) {
        data.regraUpgrade = String(body.regraUpgrade ?? '').trim() || null;
      }
      if (body.permiteDowngrade !== undefined) {
        const parsed = parsePermiteUpgradeDowngrade(body.permiteDowngrade);
        data.permiteDowngrade = parsed ?? null;
        if (parsed !== true) data.regraDowngrade = null;
        else if (body.regraDowngrade !== undefined) {
          data.regraDowngrade = String(body.regraDowngrade ?? '').trim() || null;
        }
      } else if (body.regraDowngrade !== undefined) {
        data.regraDowngrade = String(body.regraDowngrade ?? '').trim() || null;
      }

      let effFilial: string | null = existing.filialId;
      if (body.filialId !== undefined) {
        const parsed = parseOptionalId(body.filialId);
        if (parsed) {
          const fil = await prisma.placementFilial.findUnique({ where: { id: parsed } });
          if (!fil) {
            return reply.status(404).send({ error: 'Filial não encontrada' });
          }
        }
        data.filialId = parsed;
        effFilial = parsed;
      }

      if (body.corretorParceiroId !== undefined) {
        const parsedCp = parseOptionalId(body.corretorParceiroId);
        if (parsedCp) {
          const cp = await prisma.placementCorretorParceiro.findUnique({ where: { id: parsedCp } });
          if (!cp) {
            return reply.status(404).send({ error: 'Corretor parceiro não encontrado' });
          }
        }
        data.corretorParceiroId = parsedCp;
      }

      if (body.projetoId !== undefined) {
        const parsedPr = parseOptionalId(body.projetoId);
        if (parsedPr) {
          const pr = await prisma.placementProjeto.findUnique({ where: { id: parsedPr } });
          if (!pr) return reply.status(404).send({ error: 'Projeto não encontrado' });
        }
        data.projetoId = parsedPr;
      }

      if (body.pedidoId !== undefined) {
        const parsedPe = parseOptionalId(body.pedidoId);
        if (parsedPe) {
          const pe = await prisma.placementPedido.findUnique({ where: { id: parsedPe } });
          if (!pe) return reply.status(404).send({ error: 'Tipo de pedido/conta não encontrado' });
        }
        data.pedidoId = parsedPe;
      }

      if (body.solicitante !== undefined) {
        data.solicitante = String(body.solicitante ?? '').trim() || null;
      }

      if (body.temperaturaId !== undefined) {
        const parsedTe = parseOptionalId(body.temperaturaId);
        if (parsedTe) {
          const te = await prisma.placementTemperatura.findUnique({ where: { id: parsedTe } });
          if (!te) return reply.status(404).send({ error: 'Temperatura não encontrada' });
        }
        data.temperaturaId = parsedTe;
      }

      const mergedCondicaoId =
        data.condicaoId !== undefined ? (data.condicaoId as string | null) : existing.condicaoId;
      if (
        !isDraft &&
        (effCliente || effProspect || (!effProspect && mergedCondicaoId)) &&
        !effFilial
      ) {
        return reply.status(400).send({
          error: 'Filial obrigatória',
          message: 'Selecione a filial cadastrada em Dados → Placement → Filial.',
        });
      }

      const updated = await prisma.placementCotacao.update({
        where: { id },
        data,
        include: cotacaoInclude,
      });
      const light = String((request.query as { light?: string })?.light ?? '') === '1';
      if (light) {
        return {
          id: updated.id,
          status: updated.status,
          emCotacaoSubetapa: updated.emCotacaoSubetapa,
          updatedAt: updated.updatedAt,
          kickOffEstrategia: updated.kickOffEstrategia,
          vidas: updated.vidas,
          valorEstimadoCents: updated.valorEstimadoCents,
        };
      }
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/cotacoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/cotacoes/:id/duplicate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const source = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!source) return reply.status(404).send({ error: 'Cotação não encontrada' });

      const isDraft = isRascunhoStatusApi(source.status);
      const requestUserId = body.userId ? String(body.userId) : null;
      if (isDraft && requestUserId && source.userId && requestUserId !== source.userId) {
        return reply.status(403).send({
          error: 'Rascunho de outro usuário',
          message: 'Este rascunho pertence a outro usuário.',
        });
      }

      const ticket = await generateCotacaoTicket(prisma);
      const created = await prisma.placementCotacao.create({
        data: {
          ticket,
          status: isDraft ? PLACEMENT_STATUS_RASCUNHO : 'Aberta',
          analistaId: source.analistaId,
          analistaResponsavelId: isDraft ? source.analistaResponsavelId : null,
          userId: requestUserId ?? source.userId,
          clienteId: source.clienteId,
          prospectId: source.prospectId,
          condicaoId: source.condicaoId,
          filialId: source.filialId,
          corretorParceiroId: source.corretorParceiroId,
          projetoId: source.projetoId,
          pedidoId: source.pedidoId,
          solicitante: source.solicitante,
          temperaturaId: source.temperaturaId,
          vigenciaApolice: source.vigenciaApolice,
          tipoContratacaoId: source.tipoContratacaoId,
          modalidadeContratoId: source.modalidadeContratoId,
          prazoVigenciaContratoId: source.prazoVigenciaContratoId,
          breakEven: source.breakEven,
          formularioTipo: source.formularioTipo,
          multaRescisaoContratual: source.multaRescisaoContratual,
          multaRescisaoValor: source.multaRescisaoValor,
          multaRescisaoRegra: source.multaRescisaoRegra,
          multaRescisaoAvisoPrevio: source.multaRescisaoAvisoPrevio,
          possuiConvencaoColetiva: source.possuiConvencaoColetiva,
          convencaoColetivaDetalhe: source.convencaoColetivaDetalhe,
          permiteUpgrade: source.permiteUpgrade,
          regraUpgrade: source.regraUpgrade,
          permiteDowngrade: source.permiteDowngrade,
          regraDowngrade: source.regraDowngrade,
          permiteUpgradeDowngrade: null,
          regraUpgradeDowngrade: null,
          ramo: source.ramo,
          operadorasIds: source.operadorasIds ?? undefined,
          operadorasSugestaoIds: source.operadorasSugestaoIds ?? undefined,
          itensMapeamento: source.itensMapeamento ?? undefined,
          planosCobertura: source.planosCobertura ?? undefined,
          vidas: source.vidas,
          valorEstimadoCents: source.valorEstimadoCents,
          dataInicio: source.dataInicio,
          dataLimite: source.dataLimite,
          descricao: source.descricao,
          observacoes: source.observacoes,
          emCotacaoSubetapa: isDraft ? source.emCotacaoSubetapa : 'beneficiarios',
          kickOffEstrategia: isDraft ? (source.kickOffEstrategia ?? undefined) : undefined,
        },
        include: cotacaoInclude,
      });

      const beneficiarios = await prisma.placementCotacaoBeneficiario.findMany({
        where: { cotacaoId: id },
        orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
      });
      if (beneficiarios.length > 0) {
        await insertBeneficiariosBatched(
          prisma,
          created.id,
          beneficiarios.map(({ id: _bid, cotacaoId: _cid, createdAt: _ca, updatedAt: _ua, ...row }) => row)
        );
      }

      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/cotacoes/:id/duplicate:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/cotacoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });
      await prisma.placementCotacao.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/cotacoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}
