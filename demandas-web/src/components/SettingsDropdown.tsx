import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, User, Palette, Bell, Moon, Sun, Globe, LogOut, Check, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { useKanbanStore } from '../store/kanbanStore'

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('pt-BR')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [activeSection, setActiveSection] = useState<'general' | 'appearance' | 'data' | 'account'>('general')
  
  // Estados para alteração de senha
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  
  // Estados para trocar usuário
  const [showChangeUser, setShowChangeUser] = useState(false)
  const [changeUserEmail, setChangeUserEmail] = useState('')
  const [changeUserPassword, setChangeUserPassword] = useState('')
  const [showChangeUserPassword, setShowChangeUserPassword] = useState(false)
  const [changeUserError, setChangeUserError] = useState('')
  const [changeUserLoading, setChangeUserLoading] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout: clearAuth, setAuth, updateUserPhoto } = useAuthStore()
  const { clear: clearNotifications } = useNotificationStore()
  
  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Carregar configurações do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    const savedLanguage = localStorage.getItem('language') as 'pt-BR' | 'en'
    const savedNotifications = localStorage.getItem('notifications-enabled')
    const savedAutoSave = localStorage.getItem('auto-save')
    
    if (savedTheme) setTheme(savedTheme)
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedNotifications !== null) setNotificationsEnabled(savedNotifications === 'true')
    if (savedAutoSave !== null) setAutoSave(savedAutoSave === 'true')
  }, [])
  
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }
  
  const handleLanguageChange = (newLanguage: 'pt-BR' | 'en') => {
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }
  
  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    localStorage.setItem('notifications-enabled', enabled.toString())
  }
  
  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSave(enabled)
    localStorage.setItem('auto-save', enabled.toString())
  }
  

  
  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      clearAuth()
    }
  }

  const handleChangePassword = async () => {
    // Resetar mensagens
    setPasswordError('')
    setPasswordSuccess('')
    
    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Todos os campos são obrigatórios')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem')
      return
    }
    
    try {
      // Aqui você implementaria a chamada real para a API
      // Por enquanto, vamos simular uma alteração bem-sucedida
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPasswordSuccess('Senha alterada com sucesso!')
      
      // Limpar campos
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        setShowChangePassword(false)
        setPasswordSuccess('')
      }, 2000)
      
    } catch (error) {
      setPasswordError('Erro ao alterar senha. Tente novamente.')
    }
  }

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSuccess('')
    setShowChangePassword(false)
  }

  const resetChangeUserForm = () => {
    setChangeUserEmail('')
    setChangeUserPassword('')
    setChangeUserError('')
    setShowChangeUser(false)
  }

  const handleChangeUser = async () => {
    // Resetar mensagens
    setChangeUserError('')
    
    // Validações
    if (!changeUserEmail || !changeUserPassword) {
      setChangeUserError('Todos os campos são obrigatórios')
      return
    }
    
    setChangeUserLoading(true)
    
    try {
      // Fazer login com o novo usuário
      const response = await fetch(`https://nigteste-production.up.railway.app/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: changeUserEmail,
          password: changeUserPassword
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Fazer logout do usuário atual
        clearAuth()
        
        // Fazer login com o novo usuário
        setAuth(data.token, data.user)
        
        // Fechar modal e dropdown
        setShowChangeUser(false)
        setIsOpen(false)
        
        // Limpar formulário
        resetChangeUserForm()
        
      } else {
        const errorData = await response.json()
        setChangeUserError(errorData.message || 'Credenciais inválidas')
      }
    } catch (error) {
      setChangeUserError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setChangeUserLoading(false)
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.')
        return
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.')
        return
      }
      
      // Converter para base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          updateUserPhoto(result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const sections = [
    { id: 'general', label: 'Geral', icon: Settings },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'account', label: 'Conta', icon: User }
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            {/* Notificações */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Notificações</h4>
                  <p className="text-sm text-blue-700">Gerencie suas notificações</p>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => handleNotificationsToggle(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-blue-900">Ativar notificações</span>
                {notificationsEnabled ? <Check className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-blue-400" />}
              </label>
            </div>

            {/* Auto-save */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                             <div className="flex items-center gap-3 mb-3">
                 <div className="p-2 bg-green-100 rounded-lg">
                   <Bell className="w-5 h-5 text-green-600" />
                 </div>
                <div>
                  <h4 className="font-semibold text-green-900">Auto-save</h4>
                  <p className="text-sm text-green-700">Salvamento automático de dados</p>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200 cursor-pointer hover:bg-green-50 transition-colors">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-green-900">Salvar automaticamente</span>
                {autoSave ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-green-400" />}
              </label>
            </div>

            {/* Idioma */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900">Idioma</h4>
                  <p className="text-sm text-purple-700">Selecione seu idioma preferido</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'pt-BR' | 'en')}
                className="w-full px-4 py-3 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            {/* Tema */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Palette className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900">Tema da Interface</h4>
                  <p className="text-sm text-amber-700">Escolha entre tema claro ou escuro</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl text-sm font-medium transition-all ${
                    theme === 'light' 
                      ? 'bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-lg scale-105' 
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  Claro
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark' 
                      ? 'bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-lg scale-105' 
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  Escuro
                </button>
              </div>
            </div>

            {/* Preview do tema */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-xl border border-slate-100">
              <h4 className="font-semibold text-slate-900 mb-3">Preview do Tema</h4>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} border border-slate-200`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                </div>
                <p className="text-sm">Este é um exemplo de como ficará a interface com o tema selecionado.</p>
              </div>
            </div>
          </div>
        )

      case 'account':
        return (
          <div className="space-y-6">
            {/* Perfil do usuário */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-6 rounded-xl border border-violet-100 text-center">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
                  {user?.photo ? (
                    <img 
                      src={user.photo} 
                      alt="Foto do usuário" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                <button
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-violet-300 rounded-full flex items-center justify-center hover:bg-violet-50 transition-colors shadow-lg"
                  title="Alterar foto"
                >
                  <Settings className="w-4 h-4 text-violet-600" />
                </button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <h3 className="text-xl font-bold text-violet-900 mb-1">{user?.name || 'Usuário'}</h3>
              <p className="text-violet-700 mb-2">{user?.email || 'user@example.com'}</p>
              <span className="inline-block px-3 py-1 bg-violet-100 text-violet-800 text-xs font-medium rounded-full capitalize">
                {user?.role || 'user'}
              </span>
            </div>

            {/* Alterar Senha */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Alterar Senha</h4>
                  <p className="text-sm text-blue-700">Atualize sua senha de acesso</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Alterar Senha
              </button>
            </div>

            {/* Trocar Usuário */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Trocar Usuário</h4>
                  <p className="text-sm text-slate-700">Mude para outro usuário da sua conta</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeUser(true)}
                className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Trocar Usuário
              </button>
            </div>

            {/* Logout */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <LogOut className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Sair da Conta</h4>
                  <p className="text-sm text-slate-700">Encerra sua sessão atual</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de configurações */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2.5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
          {user?.photo ? (
            <img 
              src={user.photo} 
              alt="Foto do usuário" 
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-slate-900">{user?.name || 'Usuário'}</p>
          <p className="text-xs text-slate-500">{user?.email || 'user@example.com'}</p>
        </div>
        <Settings className="w-4 h-4 text-slate-400" />
      </motion.button>
      
      {/* Dropdown de configurações */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute right-0 top-14 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[600px] overflow-hidden backdrop-blur-sm"
          >
            {/* Header do dropdown */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Configurações</h2>
              <button
                onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                  <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
              {/* Navegação por seções */}
                <div className="flex gap-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSection === section.id
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.label}
                  </button>
                ))}
                </div>
              </div>
              
            {/* Conteúdo da seção */}
            <div className="max-h-96 overflow-y-auto p-6">
              {renderSection()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Alteração de Senha */}
      <AnimatePresence>
        {showChangePassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => resetPasswordForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Alterar Senha</h3>
                <button
                  onClick={resetPasswordForm}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Senha Atual */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirme a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Mensagens de Erro/Sucesso */}
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">{passwordSuccess}</p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetPasswordForm}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Alterar Senha
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Trocar Usuário */}
      <AnimatePresence>
        {showChangeUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => resetChangeUserForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Trocar Usuário</h3>
                <button
                  onClick={resetChangeUserForm}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email do Usuário
                  </label>
                  <input
                    type="email"
                    value={changeUserEmail}
                    onChange={(e) => setChangeUserEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o email do usuário"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showChangeUserPassword ? 'text' : 'password'}
                      value={changeUserPassword}
                      onChange={(e) => setChangeUserPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite a senha do usuário"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangeUserPassword(!showChangeUserPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showChangeUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Mensagem de Erro */}
                {changeUserError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{changeUserError}</p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetChangeUserForm}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    disabled={changeUserLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleChangeUser}
                    disabled={changeUserLoading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {changeUserLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      'Trocar Usuário'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
