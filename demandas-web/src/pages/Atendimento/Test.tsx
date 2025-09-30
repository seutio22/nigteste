import React from 'react'

export default function AtendimentoTestPage() {
  console.log('🔍 AtendimentoTestPage: Renderizando...')
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        ✅ PÁGINA DE TESTE FUNCIONANDO!
      </h1>
      <p className="text-lg text-gray-700 mb-4">
        Se você está vendo esta mensagem, a página está carregando corretamente.
      </p>
      <div className="bg-green-100 p-4 rounded-lg">
        <p className="text-green-800">
          <strong>Status:</strong> Página carregada com sucesso! 🎉
        </p>
      </div>
    </div>
  )
}
