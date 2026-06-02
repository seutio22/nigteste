import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  TextField,
  Typography,
  ListItemText,
  Alert,
  Collapse
} from '@mui/material'
import { ChevronDown, ChevronRight, Copy, Mail, Users, X, CheckCircle } from 'lucide-react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'
import type { Demand } from '../types/demand'
import { buildEmlForOutlook } from '../utils/buildEmlForOutlook'
import { copyRichHtmlToClipboard } from '../utils/copyRichHtmlClipboard'
import { embedEmailImagesForOutlookClipboard } from '../utils/embedEmailImagesForOutlookClipboard'

type Props = {
  open: boolean
  onClose: () => void
  demanda: Demand
}

/** Modelos de comunicado na página Cadastro. */
export type ModeloComunicadoCadastro = 'edge' | 'moveLocal' | 'move'

const MODELOS: { id: ModeloComunicadoCadastro; label: string; disponivel: boolean }[] = [
  { id: 'edge', label: 'Edge', disponivel: true },
  { id: 'moveLocal', label: 'Move Local', disponivel: true },
  { id: 'move', label: 'MOVE', disponivel: true }
]

const NIG_SIGNATURE = 'NIG - Núcleo de Inteligência e Governança'

const escapeHtml = (value?: string | null) =>
  (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizeText = (value?: string | null) => escapeHtml(value).replace(/\s+/g, ' ').trim()

function buildHtmlEdge(nomeDestinatario: string): string {
  const nome =
    nomeDestinatario.trim() !== '' ? escapeHtml(nomeDestinatario.trim()) : '<span style="color:#64748b;font-style:italic;">(Nome)</span>'

  /*
   * Template "email-safe" (tabelas + estilos inline) alinhado ao HTML de referência anexado
   * (largura 600px, fundo #cbd6e2, blocos alternando branco e azul-claro, rodapé azul-escuro).
   */
  const ff = 'font-family:Arial, Helvetica, sans-serif'
  const headerImageUrl =
    '/email/MDS_NIG_Header_Email_02.png'

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml" lang="pt-BR">
<head>
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Edge | Boas-vindas</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body bgcolor="#cbd6e2" style="margin:0 !important; padding:0 !important; ${ff}; font-size:15px; color:#002561; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%;">
  <div style="background-color:#cbd6e2" bgcolor="#cbd6e2">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0; padding:0; width:100% !important; min-width:320px !important; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
      <tr>
        <td align="center" valign="top" style="padding:20px 10px;">

          <!-- Container 600 -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; border-collapse:collapse;">
            <tr>
              <td style="padding:0; font-size:0; line-height:0;">
                <img
                  alt="NIG — Núcleo de Informações Gerenciais"
                  src="${headerImageUrl}"
                  width="600"
                  style="display:block; outline:none; text-decoration:none; border:0; width:600px; max-width:100%; height:auto; font-size:16px;"
                  align="middle"
                />
              </td>
            </tr>

            <!-- Bloco branco -->
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h1 style="margin:0; line-height:175%; font-size:24px; color:#002561; ${ff};">Edge | Boas-vindas</h1>
                <p style="line-height:175%; margin:14px 0 0 0; font-size:16px; color:#002561; ${ff};">
                  <strong style="color:#002561;">${nome}</strong>, seja bem-vinda(o) ao Edge!
                </p>
                <p style="line-height:175%; margin:14px 0 0 0; color:#002561; ${ff};">
                  A criação do seu acesso no Edge foi concluída com sucesso, e seu perfil já se encontra parametrizado de acordo com a sua necessidade.
                </p>
              </td>
            </tr>

            <!-- Bloco azul claro -->
            <tr>
              <td bgcolor="#e6f6fc" style="background-color:#e6f6fc; padding:30px 40px; ${ff};">
                <p style="line-height:175%; margin:0; font-weight:bold; color:#002561; ${ff};">Primeiro acesso</p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Você deve ter recebido um e-mail solicitando o cadastro da senha. Esse e-mail expira em 5 minutos.
                  Após esse prazo, acesse o link do <a href="https://edge.mdsgroup.com/Home" target="_blank" rel="noopener" style="color:#009fdf; font-weight:bold; text-decoration:underline; ${ff};">EDGE</a> e clique em
                  <strong>&quot;Esqueceu a senha?&quot;</strong>, informe o seu e-mail e siga o passo-a-passo do novo e-mail de recuperação.
                </p>
              </td>
            </tr>

            <!-- Bloco branco -->
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h3 style="margin:0; font-size:18px; line-height:175%; color:#002561; ${ff};">Time NIG</h3>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Não sabe onde nos encontrar? 🧐 é fácil, fácil, toda a nossa equipe está disponível para atendimento através do Flow e Teams. Vem conhecer nosso time:
                </p>

                <!-- Card com lista da equipe (email-safe) -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:16px 0 0 0;">
                  <tr>
                    <td bgcolor="#f7fbfe" style="background-color:#f7fbfe; border:1px solid #cfeaf6; border-left:4px solid #009fdf; padding:16px 16px 14px 16px; ${ff};">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                        <tr>
                          <td valign="top" width="50%" style="padding:0 10px 0 0; ${ff};">
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Karina Passeti</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Paula Petrovic</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Emyli Almeida</p>
                          </td>
                          <td valign="top" width="50%" style="padding:0 0 0 10px; ${ff};">
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Raiane Silva</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Cristina Monteiro</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Camilla Silveira</p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:10px 0 0 0; line-height:165%; font-size:13px; color:#002561; ${ff};">
                        Responsáveis pela manutenção dos cadastros do Edge e suporte ao sistema.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Liderança -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:14px 0 0 0;">
                  <tr>
                    <td style="${ff};">
                      <p style="margin:0; line-height:175%; font-weight:bold; color:#002561; ${ff};">Denison Silva</p>
                      <p style="margin:0; line-height:175%; color:#64748b; ${ff};">Gerência.</p>
                    </td>
                  </tr>
                </table>

                <p style="line-height:175%; margin:14px 0 0 0; color:#002561; ${ff};">
                  Possui dúvidas, sugestões ou solicitações? Vem falar com a gente.
                </p>
              </td>
            </tr>

            <!-- Rodapé azul -->
            <tr>
              <td bgcolor="#002561" style="background-color:#002561; padding:26px 40px; ${ff};">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" valign="middle" style="${ff}; color:#ffffff;">
                      <p style="margin:0; font-size:14px; line-height:150%; color:#ffffff; ${ff};">
                        Proteger seu mundo é a nossa ambição.
                      </p>
                      <p style="margin:10px 0 0 0; font-size:12px; line-height:150%; color:#cfe8ff; ${ff};">
                        ${NIG_SIGNATURE}
                      </p>
                    </td>
                    <td align="right" valign="middle" style="font-size:0; line-height:0;">
                      <img
                        alt="MDS"
                        src="https://mdsinsure-com-br-7415529.hs-sites-eu1.com/hs-fs/hubfs/MDS_LOGObranco.png?width=126&upscale=true&name=MDS_LOGObranco.png"
                        width="63"
                        style="display:block; outline:none; text-decoration:none; border:0; width:63px; height:auto; font-size:16px;"
                        align="middle"
                      />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
          <!-- /Container 600 -->

        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

function buildHtmlMove(nomeDestinatario: string, emailLogin: string): string {
  const nome =
    nomeDestinatario.trim() !== ''
      ? escapeHtml(nomeDestinatario.trim())
      : '<span style="color:#64748b;font-style:italic;">(Nome)</span>'
  const email =
    emailLogin.trim() !== ''
      ? escapeHtml(emailLogin.trim())
      : '<span style="color:#64748b;font-style:italic;">(e-mail)</span>'

  const ff = 'font-family:Arial, Helvetica, sans-serif'
  const headerImageUrl =
    '/email/MDS_NIG_Header_Email_02.png'

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml" lang="pt-BR">
<head>
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MOVE | Boas-vindas</title>
</head>
<body bgcolor="#cbd6e2" style="margin:0 !important; padding:0 !important; ${ff}; font-size:15px; color:#002561; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%;">
  <div style="background-color:#cbd6e2" bgcolor="#cbd6e2">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0; padding:0; width:100% !important; min-width:320px !important; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
      <tr>
        <td align="center" valign="top" style="padding:20px 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; border-collapse:collapse;">
            <tr>
              <td style="padding:0; font-size:0; line-height:0;">
                <img
                  alt="NIG — Núcleo de Informações Gerenciais"
                  src="${headerImageUrl}"
                  width="600"
                  style="display:block; outline:none; text-decoration:none; border:0; width:600px; max-width:100%; height:auto; font-size:16px;"
                  align="middle"
                />
              </td>
            </tr>

            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h1 style="margin:0; line-height:175%; font-size:24px; color:#002561; ${ff};">MOVE | Boas-vindas</h1>
                <p style="line-height:175%; margin:14px 0 0 0; font-size:16px; color:#002561; ${ff};">
                  <strong style="color:#002561;">${nome}</strong>, seja bem-vindo(a) ao Move! 🧐
                </p>
                <p style="line-height:175%; margin:12px 0 0 0; color:#002561; ${ff};">
                  A criação do seu login para acesso no Move foi concluída.
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#e6f6fc" style="background-color:#e6f6fc; padding:30px 40px; ${ff};">
                <p style="line-height:175%; margin:0; font-weight:bold; color:#002561; ${ff};">Funcionalidades 📣</p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Através do Portal de Arquivos do Move você tem facilidades para solicitar rapidamente muitos serviços. Confira abaixo:
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:12px 0 0 0;">
                  <tr>
                    <td style="${ff}; color:#002561;">
                      <p style="margin:0; line-height:175%;">• Inclusões.</p>
                      <p style="margin:0; line-height:175%;">• Alterações.</p>
                      <p style="margin:0; line-height:175%;">• Exclusões.</p>
                      <p style="margin:0; line-height:175%;">• 2ª via de carteirinha.</p>
                      <p style="margin:0; line-height:175%;">• Transferência de empresas.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h3 style="margin:0; font-size:18px; line-height:175%; color:#002561; ${ff};">Orientações de Login</h3>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  As parametrizações foram finalizadas, e agora você está pronto para navegar por nossas telas e usufruir de todas as funcionalidades dispostas em seu perfil.
                </p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Para acompanhar as solicitações basta acessar a página do Move com os dados abaixo.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:14px 0 0 0;">
                  <tr>
                    <td bgcolor="#f7fbfe" style="background-color:#f7fbfe; border:1px solid #cfeaf6; border-left:4px solid #009fdf; padding:16px 16px 14px 16px; ${ff};">
                      <p style="margin:0; line-height:175%; color:#002561; ${ff};"><strong>Login:</strong> ${email}</p>
                      <p style="margin:0; line-height:175%; color:#002561; ${ff};"><strong>Senha:</strong> 123456</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td bgcolor="#e6f6fc" style="background-color:#e6f6fc; padding:30px 40px; ${ff};">
                <p style="line-height:175%; margin:0; font-weight:bold; color:#002561; ${ff};">Importante: Troca de Senha</p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Para a troca de senha, clique em “Esqueci minha senha” na página inicial, preencha seu e-mail e vá em “Solicitar Nova Senha” e siga as orientações recebidas por e-mail.
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <p style="line-height:175%; margin:0; font-weight:bold; color:#002561; ${ff};">Possui dúvidas?</p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Contate seu consultor interno de Relacionamento MDS.
                </p>
                <p style="line-height:175%; margin:16px 0 0 0; color:#002561; ${ff};">
                  Conte conosco. 🤍
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#002561" style="background-color:#002561; padding:26px 40px; ${ff};">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" valign="middle" style="${ff}; color:#ffffff;">
                      <p style="margin:0; font-size:14px; line-height:150%; color:#ffffff; ${ff};">
                        Proteger seu mundo é a nossa ambição.
                      </p>
                      <p style="margin:10px 0 0 0; font-size:12px; line-height:150%; color:#cfe8ff; ${ff};">
                        ${NIG_SIGNATURE}
                      </p>
                    </td>
                    <td align="right" valign="middle" style="font-size:0; line-height:0;">
                      <img
                        alt="MDS"
                        src="https://mdsinsure-com-br-7415529.hs-sites-eu1.com/hs-fs/hubfs/MDS_LOGObranco.png?width=126&upscale=true&name=MDS_LOGObranco.png"
                        width="63"
                        style="display:block; outline:none; text-decoration:none; border:0; width:63px; height:auto; font-size:16px;"
                        align="middle"
                      />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

function buildHtmlMoveLocal(nomeDestinatario: string, loginValue: string): string {
  const nome =
    nomeDestinatario.trim() !== ''
      ? escapeHtml(nomeDestinatario.trim())
      : '<span style="color:#64748b;font-style:italic;">(Nome)</span>'
  const login =
    loginValue.trim() !== ''
      ? escapeHtml(loginValue.trim())
      : '<span style="color:#64748b;font-style:italic;">(login)</span>'

  const ff = 'font-family:Arial, Helvetica, sans-serif'
  const headerImageUrl =
    '/email/MDS_NIG_Header_Email_02.png'

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml" lang="pt-BR">
<head>
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Move Local | Boas-vindas</title>
</head>
<body bgcolor="#cbd6e2" style="margin:0 !important; padding:0 !important; ${ff}; font-size:15px; color:#002561; word-break:break-word; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%;">
  <div style="background-color:#cbd6e2" bgcolor="#cbd6e2">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0; padding:0; width:100% !important; min-width:320px !important; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
      <tr>
        <td align="center" valign="top" style="padding:20px 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; border-collapse:collapse;">
            <tr>
              <td style="padding:0; font-size:0; line-height:0;">
                <img
                  alt="NIG — Núcleo de Informações Gerenciais"
                  src="${headerImageUrl}"
                  width="600"
                  style="display:block; outline:none; text-decoration:none; border:0; width:600px; max-width:100%; height:auto; font-size:16px;"
                  align="middle"
                />
              </td>
            </tr>

            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h1 style="margin:0; line-height:175%; font-size:24px; color:#002561; ${ff};">Move Local | Boas-vindas</h1>
                <p style="line-height:175%; margin:14px 0 0 0; font-size:16px; color:#002561; ${ff};">
                  <strong style="color:#002561;">${nome}</strong>, seja bem-vinda ao Move! 🧐
                </p>
                <p style="line-height:175%; margin:12px 0 0 0; color:#002561; ${ff};">
                  A criação do seu login para acesso no Move Local foi concluída.
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#e6f6fc" style="background-color:#e6f6fc; padding:30px 40px; ${ff};">
                <p style="line-height:175%; margin:0; font-weight:bold; color:#002561; ${ff};">Atenção para as orientações de instalação e uso do Move! 📣</p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Para acesso ao sistema, você deverá abrir um chamado via TopDesk para a TI, solicitando a instalação do “Menu de Aplicações Operacionais”.
                </p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  O sistema possui acesso local e é importante se manter conectado à VPN para que ele possa funcionar adequadamente.
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h3 style="margin:0; font-size:18px; line-height:175%; color:#002561; ${ff};">Orientações de Login</h3>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Com a finalização das parametrizações agora você está pronto para navegar por nossas telas e usufruir de todas as funcionalidades dispostas em seu perfil.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:14px 0 0 0;">
                  <tr>
                    <td bgcolor="#f7fbfe" style="background-color:#f7fbfe; border:1px solid #cfeaf6; border-left:4px solid #009fdf; padding:16px 16px 14px 16px; ${ff};">
                      <p style="margin:0; line-height:175%; color:#002561; ${ff};"><strong>Login:</strong> ${login}</p>
                      <p style="margin:0; line-height:175%; color:#002561; ${ff};"><strong>Senha:</strong> 123456</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; padding:30px 40px; ${ff};">
                <h3 style="margin:0; font-size:18px; line-height:175%; color:#002561; ${ff};">Time NIG</h3>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Não sabe onde nos encontrar? 🧐 É fácil, fácil, toda a nossa equipe está disponível para atendimento através do Flow e Teams. Vem conhecer nosso time:
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:16px 0 0 0;">
                  <tr>
                    <td bgcolor="#f7fbfe" style="background-color:#f7fbfe; border:1px solid #cfeaf6; border-left:4px solid #009fdf; padding:16px 16px 14px 16px; ${ff};">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                        <tr>
                          <td valign="top" width="50%" style="padding:0 10px 0 0; ${ff};">
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Karina Passeti</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Paula Petrovic</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Emyli Almeida</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Cristina Monteiro</p>
                          </td>
                          <td valign="top" width="50%" style="padding:0 0 0 10px; ${ff};">
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Raiane Silva</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Camilla Silveira</p>
                            <p style="margin:0; line-height:175%; font-weight:bold; color:#009fdf; ${ff};">Mike Martins</p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:10px 0 0 0; line-height:165%; font-size:13px; color:#002561; ${ff};">
                        Responsáveis pela manutenção dos cadastros do Move, acessos e suporte ao sistema.
                      </p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:14px 0 0 0;">
                  <tr>
                    <td style="${ff};">
                      <p style="margin:0; line-height:175%; font-weight:bold; color:#002561; ${ff};">Denison Silva</p>
                      <p style="margin:0; line-height:175%; color:#64748b; ${ff};">Gerência.</p>
                    </td>
                  </tr>
                </table>

                <p style="line-height:175%; margin:14px 0 0 0; font-weight:bold; color:#002561; ${ff};">Possui dúvidas, sugestões ou solicitações?</p>
                <p style="line-height:175%; margin:10px 0 0 0; color:#002561; ${ff};">
                  Podemos te ajudar, basta abrir um FLOW para nós, catálogo: <strong style="color:#009fdf;">NIG</strong>.
                </p>
                <p style="line-height:175%; margin:16px 0 0 0; color:#002561; ${ff};">
                  Conte conosco! 😉
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#002561" style="background-color:#002561; padding:26px 40px; ${ff};">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" valign="middle" style="${ff}; color:#ffffff;">
                      <p style="margin:0; font-size:14px; line-height:150%; color:#ffffff; ${ff};">
                        Proteger seu mundo é a nossa ambição.
                      </p>
                      <p style="margin:10px 0 0 0; font-size:12px; line-height:150%; color:#cfe8ff; ${ff};">
                        ${NIG_SIGNATURE}
                      </p>
                    </td>
                    <td align="right" valign="middle" style="font-size:0; line-height:0;">
                      <img
                        alt="MDS"
                        src="https://mdsinsure-com-br-7415529.hs-sites-eu1.com/hs-fs/hubfs/MDS_LOGObranco.png?width=126&upscale=true&name=MDS_LOGObranco.png"
                        width="63"
                        style="display:block; outline:none; text-decoration:none; border:0; width:63px; height:auto; font-size:16px;"
                        align="middle"
                      />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

function buildHtmlPlaceholder(modelo: ModeloComunicadoCadastro): string {
  const label = MODELOS.find((m) => m.id === modelo)?.label ?? modelo
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; padding: 24px; color: #475569;">
  <p style="font-size: 16px;"><strong>${escapeHtml(label)}</strong></p>
  <p>O modelo de comunicado <strong>${escapeHtml(label)}</strong> será disponibilizado em breve nesta tela.</p>
</body></html>`
}

export function EmailComunicacaoCadastroEdgeModal({ open, onClose, demanda }: Props) {
  const md = useMasterDataStore()
  const maillingStore = useMaillingStore()

  const [modeloComunicacao, setModeloComunicacao] = useState<ModeloComunicadoCadastro>('edge')
  const [carregandoMailling, setCarregandoMailling] = useState(false)
  const [gerandoEml, setGerandoEml] = useState(false)
  const [destinatarios, setDestinatarios] = useState<string[]>([])
  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([])
  const [copiadoEmail, setCopiadoEmail] = useState(false)
  const [nomeDestinatario, setNomeDestinatario] = useState('')
  const [loginMoveLocal, setLoginMoveLocal] = useState('')
  /** Destinatários (mailling) pouco usados — secção recolhida por defeito */
  const [destinatariosExpandido, setDestinatariosExpandido] = useState(false)

  const modeloAtivo = MODELOS.find((m) => m.id === modeloComunicacao)
  const modeloDisponivel = modeloAtivo?.disponivel === true

  const infoCard = useMemo(() => {
    return {
      ticket: sanitizeText((demanda as any)?.ticket || 'N/A'),
      cliente: sanitizeText(md.clientes.find((c) => c.id === (demanda as any)?.clienteId)?.nome || 'N/A'),
      sistema: sanitizeText(md.sistemas.find((s) => s.id === (demanda as any)?.sistemaId)?.nome || 'N/A')
    }
  }, [demanda, md.clientes, md.sistemas])

  const buildHtml = () => {
    if (modeloComunicacao === 'edge') return buildHtmlEdge(nomeDestinatario)
    if (modeloComunicacao === 'move') return buildHtmlMove(nomeDestinatario, emailsSelecionados[0] || '')
    if (modeloComunicacao === 'moveLocal') return buildHtmlMoveLocal(nomeDestinatario, loginMoveLocal)
    return buildHtmlPlaceholder(modeloComunicacao)
  }

  useEffect(() => {
    if (!open) return
    setModeloComunicacao('edge')
    setCopiadoEmail(false)
    const solId = demanda?.solicitante
    const nomeSol =
      (solId && md.solicitantesById?.[solId as string]?.nome) ||
      md.solicitantes.find((s) => s.id === solId || s.nome === solId)?.nome ||
      ''
    setNomeDestinatario(nomeSol)
    setLoginMoveLocal('')
    setDestinatariosExpandido(false)
    setEmailsSelecionados([])
  }, [open, demanda, md.solicitantes, md.solicitantesById])

  // carregar/filtrar mailling ao abrir
  useEffect(() => {
    if (!open) return
    setCarregandoMailling(true)
    maillingStore.syncFromApi?.()
      .catch(() => {})
      .finally(() => setCarregandoMailling(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const contacts = maillingStore.contacts || []
    const emails = contacts
      .map((c: any) => c.email)
      .filter((e: any) => typeof e === 'string' && e.trim())
    const unique = [...new Set(emails)].slice(0, 50)
    setDestinatarios(unique)
  }, [open, maillingStore.contacts])

  const handleCopyOutlook = async () => {
    if (!modeloDisponivel) return
    try {
      const html = await embedEmailImagesForOutlookClipboard(buildHtml())
      await copyRichHtmlToClipboard(html)
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar e-mail:', error)
      alert('Erro ao copiar o e-mail. Tente novamente.')
    }
  }

  /** Ficheiro .eml: HTML + imagens inline (CID) para abrir pronto no Outlook. */
  const handleDownloadEml = async () => {
    if (!modeloDisponivel) return
    if (gerandoEml) return
    setGerandoEml(true)
    try {
      const ticket = String((demanda as any)?.ticket ?? 'comunicado').replace(/[^\w.\-]+/g, '_')
      const subjectPrefix =
        modeloComunicacao === 'moveLocal'
          ? 'Comunicado Move Local'
          : (modeloComunicacao === 'move' ? 'Comunicado MOVE' : 'Comunicado Edge')
      const emlPrefix =
        modeloComunicacao === 'moveLocal'
          ? 'comunicado-move-local'
          : (modeloComunicacao === 'move' ? 'comunicado-move' : 'comunicado-edge')
      const subject = `${subjectPrefix} — ${infoCard.ticket}`

      // Mesma base do preview, mas com imagens via CID.
      let html = buildHtml()
      html = html.split(
        '/email/MDS_NIG_Header_Email_02.png'
      ).join('cid:nig-header')
      html = html.split(
        'https://mdsinsure-com-br-7415529.hs-sites-eu1.com/hs-fs/hubfs/MDS_LOGObranco.png?width=126&upscale=true&name=MDS_LOGObranco.png'
      ).join('cid:mds-logo')

      // Buscar os binários a partir do próprio app (public/) para evitar bloqueio por CORS.
      const [headerBuf, logoBuf] = await Promise.all([
        fetch('/email/MDS_NIG_Header_Email_02.png').then((r) => r.arrayBuffer()),
        fetch('/email/MDS_LOGObranco.png').then((r) => r.arrayBuffer()),
      ])

      const eml = buildEmlForOutlook({
        html,
        subject,
        toAddresses: emailsSelecionados.length > 0 ? emailsSelecionados : undefined,
        inlineAttachments: [
          {
            contentId: 'nig-header',
            filename: 'MDS_NIG_Header_Email_02.png',
            mimeType: 'image/png',
            content: new Uint8Array(headerBuf),
          },
          {
            contentId: 'mds-logo',
            filename: 'MDS_LOGObranco.png',
            mimeType: 'image/png',
            content: new Uint8Array(logoBuf),
          },
        ],
      })

      const blob = new Blob([new TextEncoder().encode(eml)], { type: 'message/rfc822' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${emlPrefix}-${ticket}.eml`
      a.rel = 'noopener'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao gerar .eml:', error)
      alert('Erro ao gerar o arquivo .eml. Tente novamente.')
    } finally {
      setGerandoEml(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '720px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
          color: 'white',
          p: 3,
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              p: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Mail className="w-6 h-6" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
              Comunicar
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Escolha o modelo de comunicado e copie o e-mail para o Outlook
            </Typography>
          </Box>
        </Box>
        <Button
          onClick={onClose}
          sx={{
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            '&:hover': { background: 'rgba(255, 255, 255, 0.2)' }
          }}
        >
          <X className="w-5 h-5" />
        </Button>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #DCDFE3 100%)' }}>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', mb: 1.5 }}>
                Modelo de comunicado
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="modelo-comunicado-label">Selecione o modelo</InputLabel>
                <Select
                  labelId="modelo-comunicado-label"
                  label="Selecione o modelo"
                  value={modeloComunicacao}
                  onChange={(e) => setModeloComunicacao(e.target.value as ModeloComunicadoCadastro)}
                  sx={{ borderRadius: '12px' }}
                >
                  {MODELOS.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <ListItemText
                        primary={m.label}
                        secondary={m.disponivel ? 'Disponível' : 'Em breve nesta tela'}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!modeloDisponivel && (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  O modelo <strong>{modeloAtivo?.label}</strong> ainda não está disponível. Em breve poderá gerar e copiar o comunicado aqui.
                </Alert>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                Ticket: {infoCard.ticket}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Cliente: {infoCard.cliente} • Sistema: {infoCard.sistema}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}
        >
          <Button
            type="button"
            onClick={() => setDestinatariosExpandido((v) => !v)}
            size="small"
            variant="text"
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              minWidth: 0,
              px: 0.5,
              '&:hover': { bgcolor: 'action.hover' }
            }}
            startIcon={
              destinatariosExpandido ? (
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
              ) : (
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              )
            }
          >
            {destinatariosExpandido ? 'Ocultar destinatários' : 'Mostrar destinatários'}
            {!destinatariosExpandido && emailsSelecionados.length > 0 && (
              <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'text.disabled' }}>
                ({emailsSelecionados.length})
              </Typography>
            )}
          </Button>
          {!destinatariosExpandido && (
            <Typography variant="caption" sx={{ display: 'block', pl: 0.5, mt: 0.25, color: 'text.disabled', maxWidth: 520 }}>
              Opcional — e-mails do mailling (pouco uso no momento)
            </Typography>
          )}

          <Collapse in={destinatariosExpandido}>
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Users size={16} strokeWidth={2} color="#64748b" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Destinatários ({emailsSelecionados.length})
                </Typography>
              </Box>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#6b7a80' }}>
                  {carregandoMailling ? 'Carregando e-mails...' : 'E-mails do Mailling'}
                </InputLabel>
                <Select
                  multiple
                  value={emailsSelecionados}
                  onChange={(e) => setEmailsSelecionados(e.target.value as string[])}
                  disabled={carregandoMailling}
                  input={
                    <OutlinedInput
                      label={carregandoMailling ? 'Carregando e-mails...' : 'E-mails do Mailling'}
                      sx={{
                        borderRadius: '10px',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9ca3af' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#009FDF', borderWidth: '2px' }
                      }}
                    />
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((email) => (
                        <Chip
                          key={email}
                          label={email}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #002561 0%, #009FDF 100%)',
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {destinatarios.length === 0 && !carregandoMailling ? (
                    <MenuItem disabled>
                      <ListItemText primary="Nenhum e-mail encontrado" secondary="Verifique o mailling" />
                    </MenuItem>
                  ) : (
                    destinatarios.map((email) => (
                      <MenuItem key={email} value={email} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
                        <Checkbox checked={emailsSelecionados.indexOf(email) > -1} size="small" sx={{ color: '#009FDF', '&.Mui-checked': { color: '#009FDF' } }} />
                        <ListItemText primary={email} />
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
          </Collapse>
        </Box>

        <Box sx={{ p: 3, background: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Pré-visualização do e-mail
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Button
                startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopyOutlook}
                variant="contained"
                disabled={!modeloDisponivel}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
              >
                {copiadoEmail ? 'Copiado!' : 'Copiar e-mail (Outlook)'}
              </Button>
              <Button
                type="button"
                startIcon={<Mail className="w-4 h-4" />}
                onClick={handleDownloadEml}
                variant="outlined"
                disabled={!modeloDisponivel || gerandoEml}
                color="primary"
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2, borderWidth: 2 }}
              >
                {gerandoEml ? 'Gerando .eml…' : 'Baixar .eml (Outlook)'}
              </Button>
            </Box>
          </Box>

          {modeloDisponivel && (
            <>
              <TextField
                value={nomeDestinatario}
                onChange={(e) => setNomeDestinatario(e.target.value)}
                label="Nome do destinatário"
                placeholder="Ex.: nome que aparece em «(Nome), seja bem-vinda(o)…»"
                fullWidth
                sx={{ mb: 2 }}
                helperText="Se ficar em branco, a pré-visualização mostra «(Nome)» como lembrete."
              />
              {modeloComunicacao === 'moveLocal' && (
                <TextField
                  value={loginMoveLocal}
                  onChange={(e) => setLoginMoveLocal(e.target.value)}
                  label="Login (Move Local)"
                  placeholder="Ex.: nome.sobrenome"
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="Será usado no bloco «Orientações de Login»."
                />
              )}
            </>
          )}

          <Divider sx={{ my: 2 }} />
          <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #DCDFE3' }}>
            <Box sx={{ maxHeight: 420, overflow: 'auto', background: 'white' }} dangerouslySetInnerHTML={{ __html: buildHtml() }} />
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 3 }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
