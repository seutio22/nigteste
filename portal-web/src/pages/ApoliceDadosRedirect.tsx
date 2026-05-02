import { Navigate, useParams } from 'react-router-dom'

/** Compatibilidade: URLs antigas `/apolice/dados/:id` → edição unificada. */
export default function ApoliceDadosRedirect() {
  const { apoliceId } = useParams<{ apoliceId: string }>()
  if (!apoliceId) return <Navigate to="/apolice" replace />
  return <Navigate to={`/apolice/editar/${apoliceId}`} replace />
}
