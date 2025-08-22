import type { ExtractTemplate, Entity } from '../../types'

export class AIService {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string = '/api/ai', apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async *generateSummary(docId: string): AsyncGenerator<string> {
    // Mock implementation - replace with actual API call
    const mockSummary = '这是一个关于文档内容的摘要，包含了主要信息和关键点。'
    
    // Simulate streaming response
    for (let i = 0; i < mockSummary.length; i += 5) {
      yield mockSummary.slice(0, i + 5)
      await this.delay(100)
    }
  }

  async *extractTags(docId: string): AsyncGenerator<string[]> {
    // Mock implementation
    await this.delay(1000)
    yield ['合同', '协议', '商务', '法律']
  }

  async *extractEntities(docId: string): AsyncGenerator<Entity[]> {
    // Mock implementation
    await this.delay(1500)
    yield [
      { text: '张三', label: '人名', start: 10, end: 12, confidence: 0.95 },
      { text: '北京市', label: '地名', start: 20, end: 23, confidence: 0.90 },
      { text: '10万元', label: '金额', start: 35, end: 39, confidence: 0.88 }
    ]
  }

  async *customExtract(docId: string, template: ExtractTemplate): AsyncGenerator<any> {
    // Mock implementation for custom extraction
    yield { status: 'processing', progress: 0 }
    
    await this.delay(1000)
    yield { status: 'processing', progress: 30 }
    
    await this.delay(1000)
    yield { status: 'processing', progress: 60 }
    
    await this.delay(1000)
    yield { status: 'processing', progress: 90 }
    
    // Generate mock extracted data based on template
    const extractedData: Record<string, any> = {}
    
    for (const field of template.fields) {
      switch (field.type) {
        case 'text':
          extractedData[field.name] = field.name.includes('公司') ? '示例公司名称' :
                                     field.name.includes('联系人') ? '张三' :
                                     field.name.includes('地址') ? '北京市朝阳区示例街道123号' :
                                     field.name.includes('联系方式') ? '13800138000' : '示例文本'
          break
        case 'number':
          extractedData[field.name] = field.name.includes('金额') ? 100000 : 1
          break
        case 'date':
          extractedData[field.name] = new Date().toISOString().split('T')[0]
          break
        case 'select':
          extractedData[field.name] = field.options?.[0] || '选项1'
          break
        case 'textarea':
          extractedData[field.name] = '这是一个较长的文本内容示例，包含了多行信息。'
          break
        case 'boolean':
          extractedData[field.name] = true
          break
        default:
          extractedData[field.name] = '默认值'
      }
    }
    
    await this.delay(500)
    yield { 
      status: 'completed', 
      progress: 100, 
      data: extractedData,
      confidence: 0.85
    }
  }

  async *translateText(text: string, target: string): AsyncGenerator<string> {
    // Mock implementation
    const mockTranslation = target === 'en' ? 'This is a translated text.' : '这是翻译后的文本。'
    
    for (let i = 0; i < mockTranslation.length; i += 3) {
      yield mockTranslation.slice(0, i + 3)
      await this.delay(80)
    }
  }

  async *chatWithDocument(docId: string, question: string): AsyncGenerator<string> {
    // Mock implementation
    const mockAnswer = `根据文档内容，关于"${question}"的回答是：这是一个示例回答，包含了文档中的相关信息。`
    
    for (let i = 0; i < mockAnswer.length; i += 4) {
      yield mockAnswer.slice(0, i + 4)
      await this.delay(120)
    }
  }

  // Real API implementation methods (to be implemented later)
  async callExtractAPI(docId: string, template: ExtractTemplate): Promise<any> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        documentId: docId,
        template: template
      })
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }

    return response.json()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const aiService = new AIService()