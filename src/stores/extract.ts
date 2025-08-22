import { defineStore } from 'pinia'
import type { ExtractTemplate, ExtractResult, ExtractHistory } from '../types'

interface ExtractState {
  templates: ExtractTemplate[]
  results: ExtractResult[]
  currentTemplate: ExtractTemplate | null
  loading: boolean
  error: string | null
}

export const useExtractStore = defineStore('extract', {
  state: (): ExtractState => ({
    templates: [],
    results: [],
    currentTemplate: null,
    loading: false,
    error: null
  }),

  getters: {
    getTemplateById: (state) => (id: string) => {
      return state.templates.find(template => template.id === id)
    },
    
    getResultsByTemplateId: (state) => (templateId: string) => {
      return state.results.filter(result => result.templateId === templateId)
    },
    
    getResultsByFileId: (state) => (fileId: string) => {
      return state.results.filter(result => result.fileId === fileId)
    },
    
    activeTemplates: (state) => {
      return state.templates.filter(template => template.isActive)
    },
    
    getHistory: (state) => (page: number = 1, pageSize: number = 10): ExtractHistory => {
      const start = (page - 1) * pageSize
      const end = start + pageSize
      return {
        results: state.results.slice(start, end),
        total: state.results.length,
        page,
        pageSize
      }
    }
  },

  actions: {
    // Template Management
    async createTemplate(template: Omit<ExtractTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
      this.loading = true
      this.error = null
      
      try {
        const newTemplate: ExtractTemplate = {
          ...template,
          id: this.generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        this.templates.push(newTemplate)
        await this.saveToStorage()
        
        return newTemplate
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create template'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateTemplate(id: string, updates: Partial<ExtractTemplate>) {
      this.loading = true
      this.error = null
      
      try {
        const index = this.templates.findIndex(t => t.id === id)
        if (index === -1) {
          throw new Error('Template not found')
        }
        
        this.templates[index] = {
          ...this.templates[index],
          ...updates,
          updatedAt: new Date()
        }
        
        await this.saveToStorage()
        
        return this.templates[index]
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update template'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteTemplate(id: string) {
      this.loading = true
      this.error = null
      
      try {
        const index = this.templates.findIndex(t => t.id === id)
        if (index === -1) {
          throw new Error('Template not found')
        }
        
        this.templates.splice(index, 1)
        
        // Also remove related results
        this.results = this.results.filter(result => result.templateId !== id)
        
        await this.saveToStorage()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete template'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Extraction Results
    async saveExtractResult(result: Omit<ExtractResult, 'id' | 'createdAt' | 'updatedAt'>) {
      this.loading = true
      this.error = null
      
      try {
        const newResult: ExtractResult = {
          ...result,
          id: this.generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        this.results.unshift(newResult) // Add to beginning for latest first
        await this.saveToStorage()
        
        return newResult
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save result'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateExtractResult(id: string, updates: Partial<ExtractResult>) {
      this.loading = true
      this.error = null
      
      try {
        const index = this.results.findIndex(r => r.id === id)
        if (index === -1) {
          throw new Error('Result not found')
        }
        
        this.results[index] = {
          ...this.results[index],
          ...updates,
          updatedAt: new Date()
        }
        
        await this.saveToStorage()
        
        return this.results[index]
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update result'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteExtractResult(id: string) {
      this.loading = true
      this.error = null
      
      try {
        const index = this.results.findIndex(r => r.id === id)
        if (index === -1) {
          throw new Error('Result not found')
        }
        
        this.results.splice(index, 1)
        await this.saveToStorage()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete result'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Storage operations
    async loadFromStorage() {
      try {
        const templatesData = localStorage.getItem('extract-templates')
        const resultsData = localStorage.getItem('extract-results')
        
        if (templatesData) {
          this.templates = JSON.parse(templatesData).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt)
          }))
        }
        
        if (resultsData) {
          this.results = JSON.parse(resultsData).map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt)
          }))
        }
      } catch (error) {
        console.error('Failed to load from storage:', error)
      }
    },

    async saveToStorage() {
      try {
        localStorage.setItem('extract-templates', JSON.stringify(this.templates))
        localStorage.setItem('extract-results', JSON.stringify(this.results))
      } catch (error) {
        console.error('Failed to save to storage:', error)
      }
    },

    setCurrentTemplate(template: ExtractTemplate | null) {
      this.currentTemplate = template
    },

    // Utility
    generateId(): string {
      return Date.now().toString(36) + Math.random().toString(36).substr(2)
    },

    clearError() {
      this.error = null
    }
  }
})