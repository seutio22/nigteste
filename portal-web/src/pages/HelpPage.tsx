import { Link as RouterLink } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Link,
  Paper,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export default function HelpPage() {
  return (
    <Container maxWidth="md" sx={{ py: 3, pb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Ajuda
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Orientações rápidas para usar o portal do colaborador.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Como abrir uma solicitação?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Vá em <strong>Nova solicitação</strong>, escolha a <strong>área</strong> e o <strong>tipo</strong>. Os campos
              do formulário dependem do tipo configurado pela organização (texto, opções, etc.). Pode{' '}
              <strong>salvar rascunho</strong> ou <strong>enviar</strong>. Em <RouterLink to="/areas">Áreas e tipos</RouterLink>{' '}
              use <strong>Iniciar</strong> num tipo para pré-preencher área e tipo.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Onde vejo o protocolo e o andamento?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Em <RouterLink to="/solicitacoes">Minhas solicitações</RouterLink> há a lista com filtros. Clique no
              protocolo para ver detalhes, status e dados enviados.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Esqueci a senha</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              O reset de senha por e-mail ainda não está disponível neste portal. Peça a um{' '}
              <strong>administrador do portal</strong> para ajustar a sua conta ou use o fluxo interno da sua
              organização.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Gestão, operação e administração</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" component="div">
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                <li>
                  <strong>Gestor (equipe)</strong>: em{' '}
                  <RouterLink to="/gestao/solicitacoes">Gestão — equipe</RouterLink> vê solicitações dos colaboradores
                  vinculados a você (definido pelo administrador).
                </li>
                <li>
                  <strong>Operador</strong>: em <RouterLink to="/operacao/fila">Operação — fila</RouterLink> trabalha a
                  fila: prioridade, subfila (classificação), responsável e status.
                </li>
                <li>
                  <strong>Administrador</strong>: em{' '}
                  <RouterLink to="/admin/centro">Painel administrativo</RouterLink> cria usuários; o{' '}
                  <RouterLink to="/admin/centro?tab=nexus">Banco de dados Nexus</RouterLink> (sincronização com a API da
                  página Dados + catálogo de campos); e em áreas o{' '}
                  <strong>formulário visual</strong> por tipo (tipos de campo e mapeamento — sem programação).
                </li>
              </ul>
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Diferença em relação ao Nexus</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Este portal é voltado ao <strong>colaborador / solicitante</strong>. O sistema interno Nexus segue em
              paralelo, com outro acesso e regras.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>

      <Typography variant="body2" color="text.secondary">
        Dúvidas operacionais: contacte o suporte ou a área responsável na sua organização.
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        <Link component={RouterLink} to="/">
          Voltar ao início
        </Link>
      </Typography>
    </Container>
  )
}
