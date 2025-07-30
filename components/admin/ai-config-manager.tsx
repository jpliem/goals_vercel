"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bot, 
  Key, 
  MessageSquare, 
  Target, 
  TrendingUp, 
  Shield, 
  Activity,
  Save,
  TestTube,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Plus
} from "lucide-react"

interface AIConfigManagerProps {
  initialConfig?: any
}

export function AIConfigManager({ initialConfig }: AIConfigManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  
  const [config, setConfig] = useState({
    name: initialConfig?.name || "Default Configuration",
    description: initialConfig?.description || "",
    ollama_url: initialConfig?.ollama_url || "https://ollama.iotech.my.id",
    model_name: initialConfig?.model_name || "",
    system_prompt: initialConfig?.system_prompt || "You are an AI assistant helping analyze project goals and tasks. Please analyze: {goal_data} and provide detailed, actionable insights and recommendations.",
    meta_prompt: initialConfig?.meta_prompt || "You are an executive AI assistant. Please provide a comprehensive meta-analysis of the following analyses. Identify patterns, trends, common issues, and strategic insights across all analyses.\n\n{analysis_data}\n\nPlease provide:\n1. Executive Summary - Key insights across all analyses\n2. Common Patterns - Recurring themes and issues\n3. Departmental Insights - Department-specific observations\n4. Risk Assessment - Organization-wide risks identified\n5. Strategic Recommendations - High-level action items for leadership\n6. Success Factors - What's working well across goals\n\nFocus on strategic, actionable insights for leadership decision-making.",
    temperature: initialConfig?.temperature || 0.7,
    max_tokens: initialConfig?.max_tokens || 1000
  })

  const handleGetModels = async () => {
    if (!config.ollama_url) {
      setTestResult("Please enter Ollama URL first.")
      return
    }
    
    setLoadingModels(true)
    setTestResult(null)
    
    try {
      const { fetchOllamaModels } = await import('@/actions/ollama-integration')
      const result = await fetchOllamaModels(config.ollama_url)
      
      if (result.error) {
        setTestResult(`❌ ${result.error}`)
        setAvailableModels([])
      } else if (result.data) {
        setAvailableModels(result.data)
        setTestResult(`✅ Found ${result.data.length} models`)
        setTimeout(() => setTestResult(null), 3000)
      }
    } catch (error) {
      setTestResult("Failed to fetch models. Please check your connection.")
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setTestResult(null)
    
    try {
      const { saveAIConfiguration } = await import('@/actions/ollama-integration')
      const result = await saveAIConfiguration(config)
      
      if (result.error) {
        setTestResult(`❌ ${result.error}`)
      } else {
        setTestResult("✅ Configuration saved successfully!")
        setTimeout(() => setTestResult(null), 3000)
      }
    } catch (error) {
      setTestResult("Failed to save configuration. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    if (!config.ollama_url || !config.model_name) {
      setTestResult("Please set Ollama URL and select a model first.")
      return
    }
    
    setIsLoading(true)
    setTestResult("Testing connection...")
    
    try {
      const { testOllamaConnection } = await import('@/actions/ollama-integration')
      const result = await testOllamaConnection(config.ollama_url, config.model_name)
      
      if (result.error) {
        setTestResult(`❌ ${result.error}`)
      } else {
        setTestResult(`✅ Connection successful! Model: ${config.model_name}`)
        setTimeout(() => setTestResult(null), 5000)
      }
    } catch (error) {
      setTestResult("❌ Connection test failed. Please check your settings.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {testResult && (
        <Alert>
          <AlertDescription>{testResult}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="provider" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="provider" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Ollama Configuration
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Prompt Template
          </TabsTrigger>
        </TabsList>

        {/* Ollama Configuration */}
        <TabsContent value="provider" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                Ollama Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Configuration Name</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                  placeholder="e.g., Main Ollama Config"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig({...config, description: e.target.value})}
                  placeholder="Brief description of this configuration"
                />
              </div>

              <div>
                <Label htmlFor="ollama_url">Ollama URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="ollama_url"
                    type="url"
                    value={config.ollama_url}
                    onChange={(e) => setConfig({...config, ollama_url: e.target.value})}
                    placeholder="https://ollama.iotech.my.id"
                  />
                  <Button 
                    onClick={handleGetModels} 
                    disabled={loadingModels || !config.ollama_url} 
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loadingModels ? "Loading..." : "Get Models"}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <div className="flex gap-2">
                  <Select 
                    value={config.model_name} 
                    onValueChange={(value) => setConfig({...config, model_name: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.length > 0 ? (
                        availableModels.map((model) => (
                          <SelectItem key={model.name} value={model.name}>
                            {model.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)
                            </span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Click "Get Models" to load available models
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleTest} 
                    disabled={isLoading || !config.model_name} 
                    variant="outline"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = Focused, 2 = Creative</p>
                </div>

                <div>
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    min="100"
                    max="4000"
                    value={config.max_tokens}
                    onChange={(e) => setConfig({...config, max_tokens: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Prompts */}
        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                Prompt Template Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="system_prompt">Prompt Template</Label>
                <Textarea
                  id="system_prompt"
                  value={config.system_prompt}
                  onChange={(e) => setConfig({...config, system_prompt: e.target.value})}
                  rows={6}
                  placeholder="You are an AI assistant helping analyze project goals. Please analyze: {goal_data} and provide comprehensive recommendations."
                />
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-gray-100 px-1 rounded">{'{goal_data}'}</code> to insert complete goal information (title, tasks, comments, etc.)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If no <code className="bg-gray-100 px-1 rounded">{'{goal_data}'}</code> variable is used, this will work as a system prompt with the old format.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_prompt">Meta-Analysis Prompt Template</Label>
                <Textarea
                  id="meta_prompt"
                  value={config.meta_prompt}
                  onChange={(e) => setConfig({...config, meta_prompt: e.target.value})}
                  rows={8}
                  placeholder="You are an executive AI assistant. Please provide a comprehensive meta-analysis of the following analyses: {analysis_data}"
                />
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-gray-100 px-1 rounded">{'{analysis_data}'}</code> to insert all goal analyses data for meta-summary generation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This template is used when generating executive meta-summaries that analyze patterns across multiple goal analyses.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Available Analysis Types:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">risk_assessment</Badge>
                    <span className="text-muted-foreground">Identify risks and blockers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">optimization_suggestions</Badge>
                    <span className="text-muted-foreground">Improvement recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">progress_review</Badge>
                    <span className="text-muted-foreground">Current status analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">task_breakdown</Badge>
                    <span className="text-muted-foreground">Additional task suggestions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">custom</Badge>
                    <span className="text-muted-foreground">Comprehensive analysis</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Prompt Tips:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Be specific about the AI's expertise and role</li>
                  <li>• Include instructions for formatting responses</li>
                  <li>• Specify the level of detail expected</li>
                  <li>• Include any domain-specific knowledge requirements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  )
}