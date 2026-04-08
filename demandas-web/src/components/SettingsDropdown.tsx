import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, User, Palette, Bell, Moon, Sun, Globe, LogOut, Check, Eye, EyeOff, RefreshCw, Save } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useNotificationStore } from '../store/notificationStore'
import { useKanbanStore } from '../store/kanbanStore'
import { api } from '../lib/api.local'
import { applyThemeMode, getStoredTheme, THEME_CHANGE_EVENT, type ThemeMode } from '../lib/themeMode'
import { getUserDepartmentDisplay } from '../utils/userDepartmentDisplay'

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof window !== 'undefined' ? getStoredTheme() : 'light'
  )
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
  const areasById = useMasterDataStore((s) => s.areasById)
  const { clear: clearNotifications } = useNotificationStore()
  
  const formattedPasswordUpdatedAt = React.useMemo(() => {
    if (!user?.passwordUpdatedAt) return null
    const parsed = new Date(user.passwordUpdatedAt)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleString('pt-BR')
  }, [user?.passwordUpdatedAt])

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
    const savedLanguage = localStorage.getItem('language') as 'pt-BR' | 'en'
    const savedNotifications = localStorage.getItem('notifications-enabled')
    const savedAutoSave = localStorage.getItem('auto-save')

    setTheme(getStoredTheme())
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedNotifications !== null) setNotificationsEnabled(savedNotifications === 'true')
    if (savedAutoSave !== null) setAutoSave(savedAutoSave === 'true')
  }, [])

  useEffect(() => {
    const sync = (e: Event) => {
      const d = (e as CustomEvent<ThemeMode>).detail
      if (d === 'light' || d === 'dark') setTheme(d)
    }
    window.addEventListener(THEME_CHANGE_EVENT, sync)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync)
  }, [])

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme)
    applyThemeMode(newTheme)
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
      if (!user?.email) {
        setPasswordError('Usuário não encontrado. Faça login novamente.')
        return
      }

      await api.changePassword({
        email: user.email,
        currentPassword,
        newPassword
      })
      
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
      let errorMessage = 'Erro ao alterar senha. Tente novamente.'

      if (error && typeof error === 'object') {
        const anyErr = error as any
        if (anyErr?.responseText) {
          try {
            const parsed = JSON.parse(anyErr.responseText)
            if (parsed?.message) {
              errorMessage = parsed.message
            }
          } catch {}
        } else if (error instanceof Error && error.message) {
          errorMessage = error.message
        }
      }

      setPasswordError(errorMessage)
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
            {/* Notificações — info / primary */}
            <div className="bg-info-light/80 p-4 rounded-xl border border-info/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/80 rounded-lg border border-info/15 shadow-sm">
                  <Bell className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Notificações</h4>
                  <p className="text-sm text-apoio-400">Gerencie suas notificações</p>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-apoio-100 cursor-pointer hover:bg-primary-50/60 transition-colors">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => handleNotificationsToggle(e.target.checked)}
                  className="w-5 h-5 rounded border-apoio-200 text-primary-900 focus:ring-primary-500 focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-secondary-500">Ativar notificações</span>
                {notificationsEnabled ? <Check className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-apoio-300" />}
              </label>
            </div>

            {/* Auto-save — success */}
            <div className="bg-success-light p-4 rounded-xl border border-success/25">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/90 rounded-lg border border-success/20 shadow-sm">
                  <Save className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Auto-save</h4>
                  <p className="text-sm text-apoio-400">Salvamento automático de dados</p>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-apoio-100 cursor-pointer hover:bg-success-light/50 transition-colors">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                  className="w-5 h-5 rounded border-apoio-200 text-success focus:ring-success focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-secondary-500">Salvar automaticamente</span>
                {autoSave ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-apoio-300" />}
              </label>
            </div>

            {/* Idioma — apoio / secondary */}
            <div className="bg-apoio-50 p-4 rounded-xl border border-apoio-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-lg border border-apoio-100 shadow-sm">
                  <Globe className="w-5 h-5 text-primary-900" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Idioma</h4>
                  <p className="text-sm text-apoio-400">Selecione seu idioma preferido</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'pt-BR' | 'en')}
                className="w-full px-4 py-3 bg-white border border-apoio-100 rounded-lg text-sm text-secondary-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-300 transition-all"
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
            {/* Tema — warning (amarelo NIG) */}
            <div className="bg-warning-light p-4 rounded-xl border border-warning/35">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/90 rounded-lg border border-warning/25 shadow-sm">
                  <Palette className="w-5 h-5 text-warning-dark" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Tema da Interface</h4>
                  <p className="text-sm text-apoio-400">Escolha entre tema claro ou escuro</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl text-sm font-medium transition-all ${
                    theme === 'light' 
                      ? 'bg-white text-secondary-500 border-2 border-warning shadow-md scale-[1.02] ring-1 ring-warning/30' 
                      : 'bg-white/80 text-apoio-400 border border-apoio-100 hover:bg-warning-light/80 hover:border-warning/40'
                  }`}
                >
                  <Sun className="w-5 h-5 text-warning-dark" />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark' 
                      ? 'bg-secondary-700 text-white border-2 border-primary-500 shadow-md scale-[1.02] ring-1 ring-primary-400/40' 
                      : 'bg-white/80 text-apoio-400 border border-apoio-100 hover:bg-secondary-500/5 hover:border-secondary-300'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  Escuro
                </button>
              </div>
            </div>

            {/* Preview do tema */}
            <div className="bg-apoio-50 p-4 rounded-xl border border-apoio-100">
              <h4 className="font-semibold text-secondary-500 mb-3">Preview do Tema</h4>
              <div className={`p-4 rounded-lg border transition-colors ${
                theme === 'dark' 
                  ? 'bg-secondary-800 text-white border-secondary-600' 
                  : 'bg-white text-secondary-500 border-apoio-100'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-primary-500' : 'bg-primary-200'}`} />
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-apoio-300' : 'bg-apoio-200'}`} />
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-success' : 'bg-success/40'}`} />
                </div>
                <p className="text-sm text-inherit opacity-90">Este é um exemplo de como ficará a interface com o tema selecionado.</p>
              </div>
            </div>
          </div>
        )

      case 'account':
        return (
          <div className="space-y-6">
            {/* Perfil do usuário */}
            <div className="bg-gradient-to-br from-primary-50 to-apoio-50 p-6 rounded-xl border border-primary-100/80 text-center">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden bg-gradient-primary ring-4 ring-white shadow-glow-primary">
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
                  type="button"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-primary-200 rounded-full flex items-center justify-center hover:bg-primary-50 transition-colors shadow-md text-primary-900"
                  title="Alterar foto"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <h3 className="text-xl font-bold text-secondary-500 mb-1">{user?.name || 'Usuário'}</h3>
              <p className="text-apoio-400 mb-2 text-sm">{user?.email || 'user@example.com'}</p>
              <p className="text-xs text-apoio-400 mb-2">
                Última troca de senha:{' '}
                <span className="font-medium text-secondary-500">
                  {formattedPasswordUpdatedAt || 'Não informado'}
                </span>
              </p>
              <span className="inline-block px-3 py-1 bg-primary-900/90 text-white text-xs font-medium rounded-full">
                {getUserDepartmentDisplay(user ?? undefined, areasById)}
              </span>
            </div>

            {/* Alterar Senha */}
            <div className="bg-info-light/70 p-4 rounded-xl border border-info/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/90 rounded-lg border border-info/15 shadow-sm">
                  <Eye className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Alterar Senha</h4>
                  <p className="text-sm text-apoio-400">Atualize sua senha de acesso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePassword(true)}
                className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-primary-900 text-white hover:bg-primary-950 shadow-sm"
              >
                <Eye className="w-4 h-4" />
                Alterar Senha
              </button>
            </div>

            {/* Trocar Usuário */}
            <div className="bg-apoio-50 p-4 rounded-xl border border-apoio-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-lg border border-apoio-100 shadow-sm">
                  <RefreshCw className="w-5 h-5 text-apoio-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Trocar Usuário</h4>
                  <p className="text-sm text-apoio-400">Entrar com outra conta</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeUser(true)}
                className="w-full px-4 py-3 bg-white border border-apoio-100 text-secondary-500 rounded-lg text-sm font-medium hover:bg-primary-50 hover:border-primary-200 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Trocar Usuário
              </button>
            </div>

            {/* Logout */}
            <div className="bg-error-light/60 p-4 rounded-xl border border-error/25">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/90 rounded-lg border border-error/20 shadow-sm">
                  <LogOut className="w-5 h-5 text-error" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500">Sair da Conta</h4>
                  <p className="text-sm text-apoio-400">Encerra sua sessão atual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-error text-white rounded-lg text-sm font-medium hover:bg-error-dark transition-colors flex items-center justify-center gap-2 shadow-sm"
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
        className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 border border-transparent hover:border-primary-200/80 hover:bg-gradient-to-r hover:from-primary-50 hover:to-apoio-50"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gradient-primary ring-2 ring-white shadow-sm">
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
          <p className="text-sm font-medium text-secondary-500">{user?.name || 'Usuário'}</p>
          <p className="text-xs text-apoio-400">{user?.email || 'user@example.com'}</p>
        </div>
        <Settings className="w-4 h-4 text-apoio-400" />
      </motion.button>
      
      {/* Dropdown de configurações */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute right-0 top-14 w-96 bg-white dark:bg-[#151b26] border border-apoio-100 dark:border-neutral-700/80 rounded-2xl shadow-glass z-50 max-h-[600px] overflow-hidden backdrop-blur-sm transition-colors"
          >
            {/* Header do dropdown — paleta NIG (primary / secondary / apoio) */}
            <div className="bg-gradient-to-br from-primary-50 via-white to-apoio-50 dark:from-secondary-900 dark:via-[#151b26] dark:to-[#0d1114] p-6 border-b border-apoio-100 dark:border-neutral-700/80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary-500 dark:text-neutral-100">Configurações</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg transition-colors text-apoio-400 hover:text-secondary-500 hover:bg-primary-50"
              >
                  <X className="w-5 h-5" />
              </button>
            </div>
            
              {/* Navegação por seções */}
                <div className="flex gap-2">
                {sections.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSection === section.id
                        ? 'bg-white dark:bg-secondary-800 text-secondary-500 dark:text-neutral-100 shadow-sm border border-primary-200/80 dark:border-primary-600/50 ring-1 ring-primary-100 dark:ring-primary-900/50'
                        : 'text-apoio-400 dark:text-apoio-300 hover:text-secondary-500 hover:bg-white/80 dark:hover:bg-white/5'
                    }`}
                  >
                    <section.icon className="w-4 h-4 shrink-0" />
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
              className="bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-glass border border-apoio-100 dark:border-neutral-700/80 w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-secondary-500 dark:text-neutral-100">Alterar Senha</h3>
                <button
                  type="button"
                  onClick={resetPasswordForm}
                  className="p-2 hover:bg-primary-50 rounded-lg transition-colors text-apoio-400 hover:text-secondary-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Senha Atual */}
                <div>
                  <label className="block text-sm font-medium text-secondary-500 mb-2">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-apoio-100 rounded-lg text-secondary-500 placeholder:text-apoio-300 focus:ring-2 focus:ring-primary-500/35 focus:border-primary-300"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-apoio-400 hover:text-secondary-500"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-secondary-500 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-apoio-100 rounded-lg text-secondary-500 placeholder:text-apoio-300 focus:ring-2 focus:ring-primary-500/35 focus:border-primary-300"
                      placeholder="Digite a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-apoio-400 hover:text-secondary-500"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-secondary-500 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-apoio-100 rounded-lg text-secondary-500 placeholder:text-apoio-300 focus:ring-2 focus:ring-primary-500/35 focus:border-primary-300"
                      placeholder="Confirme a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-apoio-400 hover:text-secondary-500"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Mensagens de Erro/Sucesso */}
                {passwordError && (
                  <div className="p-3 bg-error-light border border-error/30 rounded-lg">
                    <p className="text-sm text-error-dark">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-success-light border border-success/30 rounded-lg">
                    <p className="text-sm text-success-dark">{passwordSuccess}</p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetPasswordForm}
                    className="flex-1 px-4 py-3 border border-apoio-100 text-secondary-500 rounded-lg font-medium hover:bg-apoio-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="flex-1 px-4 py-3 bg-primary-900 text-white rounded-lg font-medium hover:bg-primary-950 transition-colors shadow-sm"
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
              className="bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-glass border border-apoio-100 dark:border-neutral-700/80 w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-secondary-500 dark:text-neutral-100">Trocar Usuário</h3>
                <button
                  type="button"
                  onClick={resetChangeUserForm}
                  className="p-2 hover:bg-primary-50 rounded-lg transition-colors text-apoio-400 hover:text-secondary-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-secondary-500 mb-2">
                    Email do Usuário
                  </label>
                  <input
                    type="email"
                    value={changeUserEmail}
                    onChange={(e) => setChangeUserEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-apoio-100 rounded-lg text-secondary-500 placeholder:text-apoio-300 focus:ring-2 focus:ring-primary-500/35 focus:border-primary-300"
                    placeholder="Digite o email do usuário"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-secondary-500 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showChangeUserPassword ? 'text' : 'password'}
                      value={changeUserPassword}
                      onChange={(e) => setChangeUserPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-apoio-100 rounded-lg text-secondary-500 placeholder:text-apoio-300 focus:ring-2 focus:ring-primary-500/35 focus:border-primary-300"
                      placeholder="Digite a senha do usuário"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangeUserPassword(!showChangeUserPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-apoio-400 hover:text-secondary-500"
                    >
                      {showChangeUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Mensagem de Erro */}
                {changeUserError && (
                  <div className="p-3 bg-error-light border border-error/30 rounded-lg">
                    <p className="text-sm text-error-dark">{changeUserError}</p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetChangeUserForm}
                    className="flex-1 px-4 py-3 border border-apoio-100 text-secondary-500 rounded-lg font-medium hover:bg-apoio-50 transition-colors"
                    disabled={changeUserLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleChangeUser}
                    disabled={changeUserLoading}
                    className="flex-1 px-4 py-3 bg-primary-900 text-white rounded-lg font-medium hover:bg-primary-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
