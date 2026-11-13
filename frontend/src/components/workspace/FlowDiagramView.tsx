import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Trash2,
  Save,
  Sparkles,
  Eye,
  Edit3,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  RotateCcw,
  Pencil,
  Share2,
} from 'lucide-react';
import { fetchFlowDiagrams, generateFlowDiagram, saveFlowDiagram, deleteFlowDiagram } from '../../api/client';
import { FlowDiagram } from '../../types';

// ─── Custom Node ────────────────────────────────────────────────────────────────

interface CustomNodeData {
  label: string;
  mode: 'edit' | 'recall';
  recallValue?: string;
  recallResult?: 'correct' | 'incorrect' | null;
  onLabelChange?: (id: string, label: string) => void;
  onRecallInput?: (id: string, value: string) => void;
}

const CustomNode: React.FC<NodeProps> = ({ id, data, type }) => {
  const d = data as unknown as CustomNodeData;
  const isInput = type === 'input';
  const isOutput = type === 'output';
  const baseStyle = `px-4 py-2.5 rounded-lg border-2 text-xs font-medium min-w-[120px] max-w-[180px] text-center transition-all shadow-sm`;

  const colorClass = isInput
    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300'
    : isOutput
    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 dark:border-rose-600 text-rose-800 dark:text-rose-300'
    : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200';

  const recallColorClass =
    d.recallResult === 'correct'
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
      : d.recallResult === 'incorrect'
      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
      : 'border-violet-400 bg-violet-50 dark:bg-violet-950/60 dark:border-violet-600';

  if (d.mode === 'recall') {
    return (
      <div className={`${baseStyle} ${recallColorClass} flex flex-col items-center gap-1.5`}>
        <input
          type="text"
          value={d.recallValue ?? ''}
          onChange={(e) => d.onRecallInput?.(id, e.target.value)}
          placeholder="Type name..."
          className="w-full text-center bg-transparent border-b border-current/30 outline-none placeholder-stone-400/60 dark:placeholder-stone-500/60 text-xs py-0.5"
        />
        {d.recallResult === 'correct' && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" /> {d.label}
          </span>
        )}
        {d.recallResult === 'incorrect' && (
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
            <XCircle className="w-3 h-3" /> {d.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseStyle} ${colorClass}`}>
      <input
        type="text"
        value={d.label}
        onChange={(e) => d.onLabelChange?.(id, e.target.value)}
        className="w-full text-center bg-transparent outline-none font-medium text-xs"
      />
    </div>
  );
};

const nodeTypes = { input: CustomNode, output: CustomNode, default: CustomNode };

// ─── Inner canvas (needs ReactFlowProvider context) ─────────────────────────

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  mode: 'edit' | 'recall';
}

const Canvas: React.FC<CanvasProps> = ({ nodes, edges, onNodesChange, onEdgesChange, onConnect, mode }) => {
  const { fitView } = useReactFlow();
  useEffect(() => { setTimeout(() => fitView({ padding: 0.15 }), 50); }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      nodesDraggable={mode === 'edit'}
      nodesConnectable={mode === 'edit'}
      elementsSelectable={mode === 'edit'}
      panOnDrag
      zoomOnScroll
      className="bg-stone-50 dark:bg-stone-900"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
      <Controls className="[&>button]:bg-white [&>button]:dark:bg-stone-800 [&>button]:border-stone-200 [&>button]:dark:border-stone-700" />
      <MiniMap
        className="!bg-stone-100 dark:!bg-stone-800 !border-stone-200 dark:!border-stone-700"
        nodeColor={(n) =>
          n.type === 'input' ? '#6ee7b7' : n.type === 'output' ? '#fca5a5' : '#d6d3d1'
        }
      />
    </ReactFlow>
  );
};

// ─── Diagram Editor (open state) ────────────────────────────────────────────

interface EditorProps {
  diagram: FlowDiagram;
  topicId: string;
  onSaved: (d: FlowDiagram) => void;
  onClose: () => void;
}

const DiagramEditor: React.FC<EditorProps> = ({ diagram, topicId, onSaved, onClose }) => {
  const parseNodes = (json: string): Node[] => {
    try { return JSON.parse(json) as Node[]; } catch { return []; }
  };
  const parseEdges = (json: string): Edge[] => {
    try { return JSON.parse(json) as Edge[]; } catch { return []; }
  };

  const [mode, setMode] = useState<'edit' | 'recall'>('edit');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [recallInputs, setRecallInputs] = useState<Record<string, string>>({});
  const [recallResults, setRecallResults] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [recallChecked, setRecallChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState(diagram.name);
  const nextId = useRef(1000);

  // Build nodes with callbacks injected into data
  const buildDisplayNodes = useCallback(
    (baseNodes: Node[], currentMode: 'edit' | 'recall', inputs: Record<string, string>, results: Record<string, 'correct' | 'incorrect' | null>): Node[] => {
      return baseNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          mode: currentMode,
          recallValue: inputs[n.id] ?? '',
          recallResult: results[n.id] ?? null,
          onLabelChange: (id: string, label: string) => {
            setNodes((prev) => prev.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node));
          },
          onRecallInput: (id: string, value: string) => {
            setRecallInputs((prev) => ({ ...prev, [id]: value }));
          },
        },
      }));
    },
    []
  );

  useEffect(() => {
    const base = parseNodes(diagram.nodes_json);
    setNodes(buildDisplayNodes(base, mode, {}, {}));
    setEdges(parseEdges(diagram.edges_json));
  }, [diagram]);

  // Keep callbacks fresh when inputs/results change
  useEffect(() => {
    setNodes((prev) => buildDisplayNodes(prev, mode, recallInputs, recallResults));
  }, [mode, recallInputs, recallResults, buildDisplayNodes]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => buildDisplayNodes(applyNodeChanges(changes, nds), mode, recallInputs, recallResults)),
    [mode, recallInputs, recallResults, buildDisplayNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (connection) => {
      const edgeId = `e${connection.source}-${connection.target}-${Date.now()}`;
      setEdges((eds) => addEdge({ ...connection, id: edgeId, label: '', animated: false }, eds));
    },
    []
  );

  const addNode = () => {
    const id = `n${nextId.current++}`;
    const newNode: Node = {
      id,
      type: 'default',
      position: { x: 250 + Math.random() * 60 - 30, y: nodes.length * 120 },
      data: { label: 'New Block' },
    };
    setNodes((prev) => buildDisplayNodes([...prev, newNode], mode, recallInputs, recallResults));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Strip injected callback data before saving
      const cleanNodes = nodes.map(({ data, ...rest }) => ({
        ...rest,
        data: { label: (data as any).label },
      }));
      const saved = await saveFlowDiagram(
        topicId,
        diagram.id,
        JSON.stringify(cleanNodes),
        JSON.stringify(edges),
        diagramName,
      );
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(null), 2000);
      onSaved(saved);
    } catch {
      setSaveMsg('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const enterRecall = () => {
    setRecallInputs({});
    setRecallResults({});
    setRecallChecked(false);
    setMode('recall');
  };

  const checkRecall = () => {
    const results: Record<string, 'correct' | 'incorrect'> = {};
    nodes.forEach((n) => {
      const correctLabel = ((n.data as any).label as string).trim().toLowerCase();
      const userInput = (recallInputs[n.id] ?? '').trim().toLowerCase();
      results[n.id] = userInput === correctLabel ? 'correct' : 'incorrect';
    });
    setRecallResults(results);
    setRecallChecked(true);
  };

  const correctCount = recallChecked
    ? Object.values(recallResults).filter((v) => v === 'correct').length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            className="text-sm font-semibold bg-transparent outline-none text-stone-900 dark:text-stone-100 border-b border-transparent hover:border-stone-300 dark:hover:border-stone-600 focus:border-stone-400 dark:focus:border-stone-500 transition-colors px-0.5"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {mode === 'edit' ? (
            <>
              <button
                onClick={addNode}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Block
              </button>
              <button
                onClick={enterRecall}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 border border-violet-200 dark:border-violet-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Recall Mode
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saveMsg ?? (isSaving ? 'Saving…' : 'Save')}
              </button>
            </>
          ) : (
            <>
              {recallChecked && (
                <span className="text-xs font-mono font-semibold text-stone-600 dark:text-stone-300 px-2">
                  {correctCount}/{nodes.length} correct
                </span>
              )}
              {!recallChecked ? (
                <button
                  onClick={checkRecall}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-violet-600 dark:bg-violet-700 text-white hover:bg-violet-700 dark:hover:bg-violet-600 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Check Answers
                </button>
              ) : (
                <button
                  onClick={() => {
                    setRecallInputs({});
                    setRecallResults({});
                    setRecallChecked(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
              )}
              <button
                onClick={() => { setMode('edit'); setRecallInputs({}); setRecallResults({}); setRecallChecked(false); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Mode
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode indicator */}
      {mode === 'recall' && (
        <div className="px-4 py-2 bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300 flex items-center gap-2 shrink-0">
          <Eye className="w-3.5 h-3.5" />
          <strong>Recall Mode:</strong> Type the name of each block from memory, then click "Check Answers".
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            mode={mode}
          />
        </ReactFlowProvider>
      </div>

      {/* Edit mode hint */}
      {mode === 'edit' && (
        <div className="px-4 py-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400 dark:text-stone-500 shrink-0 flex items-center gap-3">
          <span>• Drag blocks to rearrange</span>
          <span>• Click a label to rename</span>
          <span>• Drag from a block handle to connect</span>
        </div>
      )}
    </div>
  );
};

// ─── Main FlowDiagramView ─────────────────────────────────────────────────────

interface Props {
  topicId: string;
  topicTitle: string;
}

export const FlowDiagramView: React.FC<Props> = ({ topicId, topicTitle }) => {
  const [diagrams, setDiagrams] = useState<FlowDiagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDiagram, setActiveDiagram] = useState<FlowDiagram | null>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const loadDiagrams = async () => {
    try {
      const data = await fetchFlowDiagrams(topicId);
      setDiagrams(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDiagrams(); }, [topicId]);

  const handleGenerate = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const diagram = await generateFlowDiagram(topicId, newName.trim(), newPrompt.trim());
      setDiagrams((prev) => [...prev, diagram]);
      setActiveDiagram(diagram);
      setShowCreateForm(false);
      setNewName('');
      setNewPrompt('');
    } catch (err: any) {
      setGenError(err?.response?.data?.detail ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this flow diagram?')) return;
    try {
      await deleteFlowDiagram(topicId, id);
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
      if (activeDiagram?.id === id) setActiveDiagram(null);
    } catch {
      // silent
    }
  };

  const handleSaved = (updated: FlowDiagram) => {
    setDiagrams((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setActiveDiagram(updated);
  };

  // Suggestion chips
  const suggestions = [
    `${topicTitle} Architecture`,
    `${topicTitle} Protocol Flow`,
    `${topicTitle} State Machine`,
    'TCP 3-Way Handshake',
    'OSI Model Layers',
    'JWT Authentication Flow',
  ];

  if (activeDiagram) {
    return (
      <div className="h-full flex flex-col">
        <DiagramEditor
          diagram={activeDiagram}
          topicId={topicId}
          onSaved={handleSaved}
          onClose={() => setActiveDiagram(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-stone-500" />
            Flow Diagram Builder
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Describe an architecture or flow — the AI scaffolds the diagram. Then practice recall by naming each block from memory.
          </p>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setGenError(null); }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" /> New Diagram
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-5 bg-stone-50/50 dark:bg-stone-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
              New Flow Diagram
            </span>
            <button onClick={() => setShowCreateForm(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Diagram Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. TCP Handshake"
              className="w-full px-3 py-2 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Describe the Architecture / Flow to Memorize
            </label>
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder={`e.g. "TCP 3-way handshake between client and server" or "OSI model 7 layers from application to physical"`}
              rows={3}
              className="w-full px-3 py-2 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors resize-none"
            />
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setNewName(s); setNewPrompt(s); }}
                  className="px-2 py-1 rounded-full text-[11px] border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors bg-white dark:bg-stone-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {genError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded px-3 py-2">
              {genError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !newName.trim() || !newPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating ? 'Generating…' : 'Generate Diagram'}
            </button>
          </div>
        </div>
      )}

      {/* Diagrams list */}
      {loading ? (
        <div className="text-xs text-stone-400 font-mono py-6 text-center">Loading diagrams…</div>
      ) : diagrams.length === 0 ? (
        <div className="border border-dashed border-stone-200 dark:border-stone-700 rounded-lg p-10 text-center space-y-3">
          <Share2 className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
          <div className="text-sm font-medium text-stone-500 dark:text-stone-400">No flow diagrams yet</div>
          <p className="text-xs text-stone-400 dark:text-stone-500 max-w-xs mx-auto">
            Click <strong>New Diagram</strong> and describe an architecture — the AI will scaffold the blocks and connections for you to study.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diagrams.map((d) => {
            let nodeCount = 0;
            let edgeCount = 0;
            try { nodeCount = JSON.parse(d.nodes_json).length; } catch {}
            try { edgeCount = JSON.parse(d.edges_json).length; } catch {}

            return (
              <div
                key={d.id}
                onClick={() => setActiveDiagram(d)}
                className="group cursor-pointer border border-stone-200 dark:border-stone-700 rounded-lg p-4 bg-white dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{d.name}</div>
                    {d.prompt && (
                      <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">{d.prompt}</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(d.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-stone-400 dark:text-stone-500">
                  <span>{nodeCount} blocks</span>
                  <span>{edgeCount} connections</span>
                  <span className="ml-auto">{new Date(d.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-mono">
                    Edit
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-mono">
                    Recall
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
