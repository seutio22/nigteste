import { Navigate } from 'react-router-dom'

/** Redireciona para o hub completo (usuários, áreas, formulários). */
export default function AdminPage() {
  return <Navigate to="/admin/centro" replace />
}
