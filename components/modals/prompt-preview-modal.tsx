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
  User, 
  Eye, 
  Copy, 
  AlertTriangle,
  Loader2,
  Zap,
  Edit,
  Save
} from "lucide-react"
import { buildCompletePrompt } from "@/actions/ollama-integration"

interface PromptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  goalId: string
  goalTitle: string
  onAnalyze?: (analysisType: string, customPrompt?: string) => void
}


export function PromptPreviewModal({ isOpen, onClose, goalId, goalTitle, onAnalyze }: PromptPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promptData, setPromptData] = useState<{
    systemPrompt: string
    userPrompt: string
    completePrompt: string
  } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<string>("")

  const loadPrompt = async () => {
    setLoading(true)
    setError(null)
    setIsEditMode(false) // Reset edit mode when loading new prompt
    
    try {
      const result = await buildCompletePrompt(goalId, 'custom')
      
      if (result.error) {
        setError(result.error)
        setPromptData(null)
        setEditedPrompt("")
      } else {
        const newPromptData = {
          systemPrompt: result.systemPrompt,
          userPrompt: result.userPrompt,
          completePrompt: result.completePrompt
        }
        setPromptData(newPromptData)
        setEditedPrompt(newPromptData.completePrompt) // Initialize edited prompt
      }
    } catch (error) {
      setError("Failed to build prompt preview")
      setEditedPrompt("")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && goalId) {
      loadPrompt()
    }
  }, [isOpen, goalId])

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handleAnalyze = () => {
    // Use edited prompt if in edit mode, otherwise use default analysis type
    if (isEditMode && editedPrompt.trim()) {
      // Pass the edited prompt as a custom prompt
      onAnalyze?.('custom', editedPrompt)
    } else {
      onAnalyze?.('custom')
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            AI Prompt Preview - {goalTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Building prompt...</span>
            </div>
          ) : error ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : promptData ? (
            <div className="space-y-6 pr-4">
              {/* Prompt Sections */}
              <Tabs defaultValue="complete" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="complete" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Complete
                  </TabsTrigger>
                  <TabsTrigger value="system" className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    System
                  </TabsTrigger>
                  <TabsTrigger value="user" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Goal Data
                  </TabsTrigger>
                  <TabsTrigger value="formatted" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Formatted
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="complete" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        {isEditMode ? 'Edit Prompt' : 'Complete Prompt (Sent to AI)'}
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditMode(!isEditMode)}
                        >
                          {isEditMode ? (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
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
                          onClick={() => handleCopy(isEditMode ? editedPrompt : promptData.completePrompt, 'complete')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'complete' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    
                    {isEditMode ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editedPrompt}
                          onChange={(e) => setEditedPrompt(e.target.value)}
                          className="min-h-96 font-mono text-xs"
                          placeholder="Edit your prompt here..."
                        />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Character count: {editedPrompt.length.toLocaleString()}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditedPrompt(promptData.completePrompt)}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Reset to Original
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-gray-100 rounded-md p-4 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                            {promptData.completePrompt}
                          </pre>
                        </div>
                        <div className="text-xs text-gray-500">
                          Character count: {promptData.completePrompt.length.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="system" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">System Prompt</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(promptData.systemPrompt, 'system')}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copied === 'system' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="bg-blue-50 rounded-md p-4">
                      <pre className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                        {promptData.systemPrompt}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="user" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Goal Data & Instructions</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(promptData.userPrompt, 'user')}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copied === 'user' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="bg-green-50 rounded-md p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-green-900 whitespace-pre-wrap font-mono leading-relaxed">
                        {promptData.userPrompt}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="formatted" className="mt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Formatted View</h4>
                    
                    <div className="space-y-4">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-blue-600" />
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            System Prompt
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                          {promptData.systemPrompt}
                        </div>
                      </div>

                      <div className="border-l-4 border-green-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-green-600" />
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            User Request
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-700 bg-green-50 p-3 rounded max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                            {promptData.userPrompt}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500">
            This preview shows exactly what will be sent to the AI model
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {promptData && onAnalyze && (
              <Button onClick={handleAnalyze} className="bg-purple-600 hover:bg-purple-700">
                <Bot className="w-4 h-4 mr-2" />
                Run Analysis
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}