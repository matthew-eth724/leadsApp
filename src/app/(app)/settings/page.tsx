'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { GripVertical, Trash2, Plus, Edit2, Download, Upload, X, Check, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface Stage { id: string; name: string; color: string; order: number }
interface FieldDefinition {
    id: string; name: string; label: string
    field_type: 'text' | 'number' | 'url' | 'date'
    required: boolean; order: number
}

const LEAD_FIELDS = ['name', 'email', 'phone', 'company', 'source', 'value', 'tags', '(skip)']
const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'url', label: 'URL' },
    { value: 'date', label: 'Date' },
]

export default function SettingsPage() {
    const queryClient = useQueryClient()
    const supabase = createClient()

    // --- Stages ---
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')
    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState('#3b82f6')
    const [deleteStageId, setDeleteStageId] = useState<string | null>(null)
    const [localStages, setLocalStages] = useState<Stage[] | null>(null)

    // --- Custom Fields ---
    const [newFieldLabel, setNewFieldLabel] = useState('')
    const [newFieldType, setNewFieldType] = useState<FieldDefinition['field_type']>('text')
    const [newFieldRequired, setNewFieldRequired] = useState(false)
    const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null)

    const { data: stages } = useQuery<Stage[]>({
        queryKey: ['stages'],
        queryFn: async (): Promise<Stage[]> => {
            const { data } = await supabase.from('stages').select('*').order('"order"', { ascending: true })
            return (data ?? []) as Stage[]
        },
    })

    useEffect(() => {
        if (stages) setLocalStages(stages)
    }, [stages])

    const displayStages: Stage[] = (localStages ?? stages ?? []) as Stage[]

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
            const res = await fetch(`/api/stages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color }),
            })
            if (!res.ok) throw new Error('Failed to update stage')
        },
        onSuccess: () => { toast.success('Stage updated'); queryClient.invalidateQueries({ queryKey: ['stages'] }); setEditingId(null) },
        onError: () => toast.error('Failed to update stage'),
    })

    const deleteStageMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/stages/${id}`, { method: 'DELETE' })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Failed to delete stage')
        },
        onSuccess: () => { toast.success('Stage deleted'); queryClient.invalidateQueries({ queryKey: ['stages'] }); setDeleteStageId(null) },
        onError: (err: Error) => toast.error(err.message),
    })

    const addStageMutation = useMutation({
        mutationFn: async () => {
            const maxOrder = Math.max(...displayStages.map((s) => s.order), 0)
            const res = await fetch('/api/stages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, color: newColor, order: maxOrder + 1 }),
            })
            if (!res.ok) throw new Error('Failed to add stage')
        },
        onSuccess: () => {
            toast.success('Stage added')
            queryClient.invalidateQueries({ queryKey: ['stages'] })
            setNewName('')
            setNewColor('#3b82f6')
        },
        onError: () => toast.error('Failed to add stage'),
    })

    const reorderMutation = useMutation({
        mutationFn: async (ordered: Stage[]) => {
            await Promise.all(
                ordered.map((s, idx) =>
                    fetch(`/api/stages/${s.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order: idx + 1 }),
                    })
                )
            )
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages'] }),
    })

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return
        const current = [...displayStages]
        const [moved] = current.splice(result.source.index, 1)
        current.splice(result.destination.index, 0, moved)
        setLocalStages(current)
        reorderMutation.mutate(current)
    }

    // --- Custom Fields mutations ---
    const { data: fieldDefs } = useQuery<FieldDefinition[]>({
        queryKey: ['field-definitions'],
        queryFn: async () => {
            const res = await fetch('/api/field-definitions')
            const json = await res.json()
            return json.fields ?? []
        },
    })

    const addFieldMutation = useMutation({
        mutationFn: async () => {
            const maxOrder = Math.max(...(fieldDefs ?? []).map((f) => f.order), 0)
            const res = await fetch('/api/field-definitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: newFieldLabel, field_type: newFieldType, required: newFieldRequired, order: maxOrder + 1 }),
            })
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to add field')
        },
        onSuccess: () => {
            toast.success('Custom field added')
            queryClient.invalidateQueries({ queryKey: ['field-definitions'] })
            setNewFieldLabel('')
            setNewFieldType('text')
            setNewFieldRequired(false)
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteFieldMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/field-definitions/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete field')
        },
        onSuccess: () => {
            toast.success('Custom field deleted')
            queryClient.invalidateQueries({ queryKey: ['field-definitions'] })
            setDeleteFieldId(null)
        },
        onError: () => toast.error('Failed to delete field'),
    })

    // --- CSV Import ---
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
    const [importing, setImporting] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvRows(results.data)
                const headers = results.meta.fields ?? []
                setCsvHeaders(headers)
                // Auto-map columns
                const autoMap: Record<string, string> = {}
                headers.forEach((h) => {
                    const lower = h.toLowerCase()
                    if (lower.includes('name')) autoMap[h] = 'name'
                    else if (lower.includes('email')) autoMap[h] = 'email'
                    else if (lower.includes('phone')) autoMap[h] = 'phone'
                    else if (lower.includes('company')) autoMap[h] = 'company'
                    else if (lower.includes('source')) autoMap[h] = 'source'
                    else if (lower.includes('value') || lower.includes('amount')) autoMap[h] = 'value'
                    else if (lower.includes('tag')) autoMap[h] = 'tags'
                    else autoMap[h] = '(skip)'
                })
                setFieldMapping(autoMap)
            },
        })
    }

    const handleImport = async () => {
        setImporting(true)
        try {
            const invertedMapping: Record<string, string> = {}
            const customFieldMappings: { fieldName: string; csvColumn: string }[] = []
            Object.entries(fieldMapping).forEach(([csvCol, leadField]) => {
                if (leadField === '(skip)') return
                if (leadField.startsWith('custom:')) {
                    customFieldMappings.push({ fieldName: leadField.replace('custom:', ''), csvColumn: csvCol })
                } else {
                    invertedMapping[leadField] = csvCol
                }
            })
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: csvRows, mapping: invertedMapping, customFieldMappings }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(`Imported ${data.imported} leads successfully!`)
            setCsvRows([])
            setCsvHeaders([])
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Import failed')
        } finally {
            setImporting(false)
        }
    }

    // --- CSV Export ---
    const [exportStage, setExportStage] = useState('')

    const handleExport = () => {
        const params = new URLSearchParams()
        if (exportStage) params.set('stage', exportStage)
        window.location.href = `/api/export?${params}`
    }

    return (
        <div className="animate-fade-in max-w-4xl">
            <Header title="Settings" subtitle="Manage stages, import and export data" />

            <Tabs defaultValue="stages">
                <TabsList className="mb-6">
                    <TabsTrigger value="stages">Stage Management</TabsTrigger>
                    <TabsTrigger value="fields">Custom Fields</TabsTrigger>
                    <TabsTrigger value="import">Import CSV</TabsTrigger>
                    <TabsTrigger value="export">Export CSV</TabsTrigger>
                </TabsList>

                {/* STAGES TAB */}
                <TabsContent value="stages">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Sales Stages</CardTitle>
                            <CardDescription>Drag to reorder, click to edit name and color</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="stages-list">
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                            {displayStages.map((stage, index) => (
                                                <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border ${snapshot.isDragging ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-slate-200'
                                                                }`}
                                                        >
                                                            <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab">
                                                                <GripVertical className="w-4 h-4" />
                                                            </div>
                                                            {editingId === stage.id ? (
                                                                <>
                                                                    <input
                                                                        type="color"
                                                                        value={editColor}
                                                                        onChange={(e) => setEditColor(e.target.value)}
                                                                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                                                    />
                                                                    <Input
                                                                        value={editName}
                                                                        onChange={(e) => setEditName(e.target.value)}
                                                                        className="flex-1 h-7 text-sm"
                                                                    />
                                                                    <Button size="icon" className="h-7 w-7" onClick={() => updateStageMutation.mutate({ id: stage.id, name: editName, color: editColor })}>
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                                                                    <span className="flex-1 text-sm font-medium text-slate-800">{stage.name}</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                                                        onClick={() => { setEditingId(stage.id); setEditName(stage.name); setEditColor(stage.color) }}
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-red-400 hover:text-red-600"
                                                                        onClick={() => setDeleteStageId(stage.id)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>

                            {/* Add New Stage */}
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                <input
                                    type="color"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0"
                                />
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="New stage name..."
                                    className="flex-1 h-9"
                                />
                                <Button
                                    onClick={() => addStageMutation.mutate()}
                                    disabled={!newName.trim() || addStageMutation.isPending}
                                >
                                    <Plus className="w-4 h-4 mr-1.5" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <ConfirmDialog
                        open={!!deleteStageId}
                        onOpenChange={(open) => !open && setDeleteStageId(null)}
                        title="Delete Stage"
                        description="Are you sure you want to delete this stage? This will fail if leads are assigned to it."
                        confirmLabel="Delete"
                        destructive
                        loading={deleteStageMutation.isPending}
                        onConfirm={() => deleteStageId && deleteStageMutation.mutate(deleteStageId)}
                    />
                </TabsContent>

                {/* CUSTOM FIELDS TAB */}
                <TabsContent value="fields">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" /> Custom Fields
                            </CardTitle>
                            <CardDescription>Define extra fields that appear on every lead form. Values are stored per-lead.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(fieldDefs ?? []).length === 0 && (
                                <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl">
                                    No custom fields yet. Add one below.
                                </div>
                            )}
                            <div className="divide-y divide-slate-100">
                                {(fieldDefs ?? []).map((field) => (
                                    <div key={field.id} className="flex items-center gap-4 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm">{field.label}</p>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-widest">{field.field_type}{field.required ? ' · required' : ''}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setDeleteFieldId(field.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Add new field */}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <p className="text-sm font-semibold text-slate-600">Add New Field</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <Label className="text-xs mb-1 block">Field Label</Label>
                                        <Input
                                            value={newFieldLabel}
                                            onChange={(e) => setNewFieldLabel(e.target.value)}
                                            placeholder="e.g. LinkedIn URL, Job Title"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1 block">Type</Label>
                                        <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FieldDefinition['field_type'])}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newFieldRequired}
                                            onChange={(e) => setNewFieldRequired(e.target.checked)}
                                            className="rounded"
                                        />
                                        Required field
                                    </label>
                                    <Button
                                        onClick={() => addFieldMutation.mutate()}
                                        disabled={!newFieldLabel.trim() || addFieldMutation.isPending}
                                        className="ml-auto"
                                    >
                                        <Plus className="w-4 h-4 mr-1.5" /> Add Field
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <ConfirmDialog
                        open={!!deleteFieldId}
                        onOpenChange={(open) => !open && setDeleteFieldId(null)}
                        title="Delete Custom Field"
                        description="This removes the field definition. Existing lead data for this field will remain stored but will no longer be displayed."
                        confirmLabel="Delete"
                        destructive
                        loading={deleteFieldMutation.isPending}
                        onConfirm={() => deleteFieldId && deleteFieldMutation.mutate(deleteFieldId)}
                    />
                </TabsContent>

                {/* IMPORT TAB */}
                <TabsContent value="import">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Import Leads from CSV</CardTitle>
                            <CardDescription>Upload a CSV file and map columns to lead fields</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">Click to upload CSV</p>
                                <p className="text-xs text-slate-400 mt-1">Supports any CSV with headers</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

                            {csvHeaders.length > 0 && (
                                <>
                                    {/* Preview */}
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 mb-2">Preview ({csvRows.length} rows)</p>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                                            <table className="text-xs w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        {csvHeaders.map((h) => <th key={h} className="px-3 py-2 text-left text-slate-600">{h}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvRows.slice(0, 5).map((row, i) => (
                                                        <tr key={i} className="border-t border-slate-100">
                                                            {csvHeaders.map((h) => <td key={h} className="px-3 py-2 text-slate-700">{row[h]}</td>)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Field Mapping */}
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 mb-2">Field Mapping</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {csvHeaders.map((header) => (
                                                <div key={header} className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-600 w-1/2 truncate" title={header}>{header}</span>
                                                    <span className="text-slate-300">→</span>
                                                    <Select
                                                        value={fieldMapping[header] ?? '(skip)'}
                                                        onValueChange={(v) => setFieldMapping((prev) => ({ ...prev, [header]: v }))}
                                                    >
                                                        <SelectTrigger className="flex-1 h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {LEAD_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                            {(fieldDefs ?? []).length > 0 && (
                                                                <>
                                                                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t mt-1 pt-2">Custom Fields</div>
                                                                    {(fieldDefs ?? []).map((f) => (
                                                                        <SelectItem key={f.id} value={`custom:${f.name}`}>{f.label}</SelectItem>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button onClick={handleImport} disabled={importing} className="w-full">
                                        <Upload className="w-4 h-4 mr-1.5" />
                                        {importing ? 'Importing...' : `Import ${csvRows.length} Leads`}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EXPORT TAB */}
                <TabsContent value="export">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Export Leads to CSV</CardTitle>
                            <CardDescription>Download your leads data as a CSV file</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>Filter by Stage</Label>
                                <Select value={exportStage} onValueChange={setExportStage}>
                                    <SelectTrigger className="w-60">
                                        <SelectValue placeholder="All stages" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All stages</SelectItem>
                                        {displayStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
                                <p className="font-medium mb-1">Export includes:</p>
                                <ul className="text-xs text-slate-500 space-y-0.5">
                                    <li>• Name, Email, Phone, Company</li>
                                    <li>• Source, Stage, Estimated Value, Tags</li>
                                    <li>• Notes count, Created date, Updated date</li>
                                </ul>
                            </div>
                            <Button onClick={handleExport} className="w-full sm:w-auto">
                                <Download className="w-4 h-4 mr-1.5" /> Download CSV
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
