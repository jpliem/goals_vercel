"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { 
  Bot, 
  BarChart3,
  Eye, 
  Copy, 
  AlertTriangle,
  Loader2,
  Zap,
  Edit,
  Save
} from "lucide-react"
import { buildCompleteMetaPrompt } from "@/actions/ollama-integration"

interface MetaPromptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onAnalyze?: (customPrompt?: string) => void
}

export function MetaPromptPreviewModal({ isOpen, onClose, onAnalyze }: MetaPromptPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promptData, setPromptData] = useState<{
    metaPrompt: string
    analysisData: string
    completePrompt: string
    analysisCount: number
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<string>("")

  // Load prompt data when modal opens
  useEffect(() => {
    if (isOpen && !promptData) {
      loadPromptData()
    }
  }, [isOpen])

  const loadPromptData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await buildCompleteMetaPrompt()
      
      if (result.error) {
        setError(result.error)
      } else {
        setPromptData(result)
        setEditedPrompt(result.metaPrompt)
      }
    } catch (err) {
      setError('Failed to load meta-analysis prompt preview')
      console.error('Error loading meta prompt:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handleEditToggle = () => {
    if (isEditMode) {
      setEditedPrompt(promptData?.metaPrompt || "")
    }
    setIsEditMode(!isEditMode)
  }

  const handleAnalyze = () => {
    if (onAnalyze) {
      const finalPrompt = isEditMode && editedPrompt !== promptData?.metaPrompt ? editedPrompt : undefined
      onAnalyze(finalPrompt)
    }
    onClose()
  }

  const resetModal = () => {
    setPromptData(null)
    setError(null)
    setLoading(false)
    setCopied(false)
    setIsEditMode(false)
    setEditedPrompt("")
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Meta-Analysis Prompt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 pr-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-purple-700">Loading meta-analysis preview...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {promptData && !loading && (
              <>
                {/* Analysis Summary */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-purple-900">Meta-Analysis Overview</h3>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                      {promptData.analysisCount} analyses to summarize
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-800">
                    This meta-analysis will process {promptData.analysisCount} individual goal analyses to identify patterns, trends, and strategic insights across your organization.
                  </p>
                </div>

                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="preview">Complete Prompt</TabsTrigger>
                    <TabsTrigger value="template">Template</TabsTrigger>
                    <TabsTrigger value="data">Analysis Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Complete Prompt (What AI will receive)</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(promptData.completePrompt)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                        {promptData.completePrompt}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="template" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        Meta-Analysis Template {isEditMode && <span className="text-orange-600">(Editing)</span>}
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditToggle}
                        >
                          {isEditMode ? (
                            <>
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </>
                          ) : (
                            <>
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(isEditMode ? editedPrompt : promptData.metaPrompt)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    
                    {isEditMode ? (
                      <Textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                        placeholder="Edit your meta-analysis prompt template..."
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                          {promptData.metaPrompt}
                        </pre>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      <p>• Use <code className="bg-gray-100 px-1 rounded">{'{analysis_data}'}</code> to insert all goal analyses data</p>
                      <p>• Template configured in AI Settings will be used if no custom prompt is provided</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Analysis Data ({promptData.analysisCount} analyses)</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(promptData.analysisData)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                        {promptData.analysisData}
                      </pre>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      This data will be substituted into the {'{analysis_data}'} variable in your template.
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {promptData && (
              <>
                Ready to analyze {promptData.analysisCount} goal analyses
                {isEditMode && editedPrompt !== promptData.metaPrompt && (
                  <span className="text-orange-600 ml-2">• Using custom prompt</span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {promptData && onAnalyze && (
              <Button 
                onClick={handleAnalyze}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Zap className="w-4 h-4 mr-1" />
                Generate Meta-Summary
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}