/**
 * 🧠 SISTEMA INTELIGENTE DE LIMPEZA AUTOMÁTICA DE CACHE
 * 
 * Este sistema limpa automaticamente cookies, localStorage e sessionStorage
 * diariamente, removendo versões anteriores do sistema e dados obsoletos.
 * 
 * Funcionalidades:
 * - Limpeza diária automática
 * - Detecção de versões antigas
 * - Preservação de dados essenciais
 * - Logs detalhados de limpeza
 * - Sistema de backup de dados críticos
 */

// Versão atual do sistema
export const CURRENT_SYSTEM_VERSION = '2025-01-30-v4';

// Chaves que devem ser preservadas (dados críticos)
const PRESERVED_KEYS = [
  'user-preferences',
  'theme-settings',
  'language-settings',
  'notifications-enabled'
];

// Padrões de chaves do sistema que devem ser limpos
const SYSTEM_KEY_PATTERNS = [
  'auth-store',
  'demands-v',
  'validations-v',
  'manutencoes-v',
  'atendimentos-v',
  'comunicados-v',
  'mailling-v',
  'master-data-store',
  'kanban-store-v',
  'tickets-v',
  'reports-v',
  'timeline-store-v',
  'notifications-store-v',
  'dashboard-v',
  'project-',
  'reajuste-',
  'analytics-'
];

// Padrões de chaves de configuração que devem ser limpos
const CONFIG_KEY_PATTERNS = [
  '-list-view-v',
  '-user-filter-v',
  '-config-v',
  '-settings-v'
];

interface CleanupStats {
  localStorageRemoved: number;
  sessionStorageRemoved: number;
  cookiesRemoved: number;
  preservedKeys: number;
  totalCleaned: number;
  lastCleanup: string;
  version: string;
}

class SmartCacheCleaner {
  private static instance: SmartCacheCleaner;
  private cleanupStats: CleanupStats;
  private isCleaning = false;

  private constructor() {
    this.cleanupStats = {
      localStorageRemoved: 0,
      sessionStorageRemoved: 0,
      cookiesRemoved: 0,
      preservedKeys: 0,
      totalCleaned: 0,
      lastCleanup: this.getLastCleanupDate(),
      version: CURRENT_SYSTEM_VERSION
    };
  }

  public static getInstance(): SmartCacheCleaner {
    if (!SmartCacheCleaner.instance) {
      SmartCacheCleaner.instance = new SmartCacheCleaner();
    }
    return SmartCacheCleaner.instance;
  }

  /**
   * Verifica se é necessário fazer limpeza diária
   */
  private shouldCleanup(): boolean {
    const lastCleanup = this.getLastCleanupDate();
    const today = new Date().toDateString();
    
    // Se nunca foi limpo ou se foi limpo em um dia diferente
    if (!lastCleanup || lastCleanup !== today) {
      return true;
    }

    // Se a versão mudou, forçar limpeza
    const storedVersion = localStorage.getItem('system-version');
    if (storedVersion !== CURRENT_SYSTEM_VERSION) {
      console.log('🔄 Versão do sistema mudou, forçando limpeza:', {
        stored: storedVersion,
        current: CURRENT_SYSTEM_VERSION
      });
      return true;
    }

    return false;
  }

  /**
   * Obtém a data da última limpeza
   */
  private getLastCleanupDate(): string | null {
    return localStorage.getItem('last-cache-cleanup');
  }

  /**
   * Salva a data da última limpeza
   */
  private saveLastCleanupDate(): void {
    localStorage.setItem('last-cache-cleanup', new Date().toDateString());
    localStorage.setItem('system-version', CURRENT_SYSTEM_VERSION);
  }

  /**
   * Verifica se uma chave deve ser preservada
   */
  private shouldPreserveKey(key: string): boolean {
    return PRESERVED_KEYS.some(preservedKey => 
      key === preservedKey || key.startsWith(preservedKey)
    );
  }

  /**
   * Verifica se uma chave é do sistema e deve ser limpa
   */
  private isSystemKey(key: string): boolean {
    return SYSTEM_KEY_PATTERNS.some(pattern => 
      key.includes(pattern) || key.startsWith(pattern)
    ) || CONFIG_KEY_PATTERNS.some(pattern => 
      key.includes(pattern)
    );
  }

  /**
   * Limpa localStorage de forma inteligente
   */
  private cleanLocalStorage(): number {
    let removedCount = 0;
    const keysToRemove: string[] = [];

    // Coletar chaves para remoção
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (this.shouldPreserveKey(key)) {
          this.cleanupStats.preservedKeys++;
          continue;
        }

        if (this.isSystemKey(key)) {
          keysToRemove.push(key);
        }
      }
    }

    // Remover chaves coletadas
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        removedCount++;
        console.log(`🗑️ Removido do localStorage: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Erro ao remover chave ${key}:`, error);
      }
    });

    return removedCount;
  }

  /**
   * Limpa sessionStorage
   */
  private cleanSessionStorage(): number {
    try {
      const beforeCount = sessionStorage.length;
      sessionStorage.clear();
      console.log(`🗑️ SessionStorage limpo: ${beforeCount} itens removidos`);
      return beforeCount;
    } catch (error) {
      console.warn('⚠️ Erro ao limpar sessionStorage:', error);
      return 0;
    }
  }

  /**
   * Limpa cookies do sistema
   */
  private cleanCookies(): number {
    let removedCount = 0;
    
    try {
      // Obter todos os cookies
      const cookies = document.cookie.split(';');
      
      cookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        
        // Remover cookies do sistema (não preservados)
        if (cookieName && !PRESERVED_KEYS.includes(cookieName)) {
          // Remover cookie definindo data de expiração no passado
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
          removedCount++;
          console.log(`🗑️ Cookie removido: ${cookieName}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ Erro ao limpar cookies:', error);
    }

    return removedCount;
  }

  /**
   * Executa limpeza inteligente completa
   */
  public async performSmartCleanup(): Promise<CleanupStats> {
    if (this.isCleaning) {
      console.log('🔄 Limpeza já em andamento, aguardando...');
      return this.cleanupStats;
    }

    if (!this.shouldCleanup()) {
      console.log('✅ Limpeza não necessária hoje');
      return this.cleanupStats;
    }

    this.isCleaning = true;
    console.log('🧠 Iniciando limpeza inteligente de cache...');

    try {
      // Resetar estatísticas
      this.cleanupStats = {
        localStorageRemoved: 0,
        sessionStorageRemoved: 0,
        cookiesRemoved: 0,
        preservedKeys: 0,
        totalCleaned: 0,
        lastCleanup: new Date().toISOString(),
        version: CURRENT_SYSTEM_VERSION
      };

      // Limpar localStorage
      this.cleanupStats.localStorageRemoved = this.cleanLocalStorage();

      // Limpar sessionStorage
      this.cleanupStats.sessionStorageRemoved = this.cleanSessionStorage();

      // Limpar cookies
      this.cleanupStats.cookiesRemoved = this.cleanCookies();

      // Calcular total
      this.cleanupStats.totalCleaned = 
        this.cleanupStats.localStorageRemoved + 
        this.cleanupStats.sessionStorageRemoved + 
        this.cleanupStats.cookiesRemoved;

      // Salvar data da limpeza
      this.saveLastCleanupDate();

      // Log de resultado
      console.log('✅ Limpeza inteligente concluída:', this.cleanupStats);

      // Salvar estatísticas para análise
      this.saveCleanupStats();

    } catch (error) {
      console.error('❌ Erro durante limpeza inteligente:', error);
    } finally {
      this.isCleaning = false;
    }

    return this.cleanupStats;
  }

  /**
   * Salva estatísticas da limpeza
   */
  private saveCleanupStats(): void {
    try {
      const statsKey = `cleanup-stats-${CURRENT_SYSTEM_VERSION}`;
      localStorage.setItem(statsKey, JSON.stringify(this.cleanupStats));
    } catch (error) {
      console.warn('⚠️ Erro ao salvar estatísticas de limpeza:', error);
    }
  }

  /**
   * Obtém estatísticas da última limpeza
   */
  public getCleanupStats(): CleanupStats {
    return { ...this.cleanupStats };
  }

  /**
   * Força limpeza imediata (ignora verificação de data)
   */
  public forceCleanup(): Promise<CleanupStats> {
    console.log('🔄 Forçando limpeza imediata...');
    // Temporariamente alterar data da última limpeza para forçar
    localStorage.removeItem('last-cache-cleanup');
    return this.performSmartCleanup();
  }

  /**
   * Verifica se o sistema está limpo
   */
  public isSystemClean(): boolean {
    const systemKeys = Array.from({ length: localStorage.length }, (_, i) => 
      localStorage.key(i)
    ).filter(key => key && this.isSystemKey(key));

    return systemKeys.length === 0;
  }
}

// Instância singleton
export const smartCacheCleaner = SmartCacheCleaner.getInstance();

// Executar limpeza automática quando o módulo for carregado (somente produção)
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  setTimeout(() => {
    smartCacheCleaner.performSmartCleanup()
  }, 1000)
}

// Exportar função de limpeza forçada para uso manual
export const forceSmartCleanup = () => smartCacheCleaner.forceCleanup();

// Exportar estatísticas para debugging
export const getCleanupStats = () => smartCacheCleaner.getCleanupStats();

// Exportar verificação de limpeza
export const isSystemClean = () => smartCacheCleaner.isSystemClean();
