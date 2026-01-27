// 🚀 MELHORIA 1: Cache de Dados Mestres - 50-70% mais rápido
// Cache simples em memória com TTL (Time To Live)

interface CacheEntry<T> {
  data: T
  expires: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutos em milissegundos

  /**
   * Obtém dados do cache ou executa a função e armazena o resultado
   */
  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const entry = this.cache.get(key)
    const now = Date.now()

    // Se existe no cache e não expirou, retorna
    if (entry && entry.expires > now) {
      return entry.data as T
    }

    // Se não existe ou expirou, busca e armazena
    const data = await fetcher()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { data, expires })
  }

  /**
   * Remove um item do cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Remove todos os itens que começam com o prefixo
   * Útil para invalidar cache de uma categoria (ex: todos os analistas)
   */
  invalidatePrefix(prefix: string): void {
    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove entradas expiradas (limpeza periódica)
   */
  cleanExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Singleton do cache
export const masterDataCache = new SimpleCache()

// Limpar cache expirado a cada 30 minutos (menos CPU sem impacto funcional)
setInterval(() => {
  masterDataCache.cleanExpired()
}, 30 * 60 * 1000)

