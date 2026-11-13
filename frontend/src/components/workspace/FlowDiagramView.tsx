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
  Handle,
  Position,
  NodeResizer,
  MarkerType,
  ConnectionMode,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeProps,
  type EdgeProps,
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
  BoxSelect,
  ArrowRight,
  X,
  Upload,
  Image as ImageIcon,
  Hammer,
  HelpCircle,
  AlertCircle,
  Maximize2,
  Minimize2,
  Link2,
  Focus,
  MoreVertical,
} from 'lucide-react';
import {
  fetchFlowDiagrams,
  generateFlowDiagram,
  createDiagramFromImage,
  saveFlowDiagram,
  deleteFlowDiagram,
} from '../../api/client';
import { FlowDiagram } from '../../types';

// ─── Custom Block Node ──────────────────────────────────────────────────────────

interface CustomNodeData {
  label: string;
  mode: 'edit' | 'recall' | 'build';
  isConnectSource?: boolean;
  recallValue?: string;
  recallResult?: 'correct' | 'incorrect' | null;
  onLabelChange?: (id: string, label: string) => void;
  onRecallInput?: (id: string, value: string) => void;
  onDeleteNode?: (id: string) => void;
}

const CustomNode: React.FC<NodeProps> = ({ id, data, type, selected }) => {
  const d = data as unknown as CustomNodeData;
  const isInput = type === 'input';
  const isOutput = type === 'output';
  const isEdit = d.mode === 'edit';
  const isConnectSource = !!d.isConnectSource;

  const colorClass = isInput
    ? 'border-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/70 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300'
    : isOutput
    ? 'border-rose-400 bg-rose-50/90 dark:bg-rose-950/70 dark:border-rose-600 text-rose-800 dark:text-rose-300'
    : 'border-stone-300 dark:border-stone-600 bg-white/95 dark:bg-stone-800/95 text-stone-800 dark:text-stone-200';

  const recallColorClass =
    d.recallResult === 'correct'
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80'
      : d.recallResult === 'incorrect'
      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/80'
      : 'border-violet-400 bg-violet-50 dark:bg-violet-950/80 dark:border-violet-600';

  const handleClass =
    "!w-3 !h-3 sm:!w-2 sm:!h-2 !bg-stone-400 hover:!bg-blue-500 transition-transform hover:scale-125 after:content-[''] after:absolute after:-inset-3.5 after:bg-transparent";

  return (
    <div
      className={`relative w-full h-full min-w-[120px] min-h-[50px] px-3 py-2 rounded-lg border-2 text-xs font-medium flex items-center justify-center text-center transition-all shadow-sm ${
        d.mode === 'recall' ? recallColorClass : colorClass
      } ${
        isConnectSource
          ? 'ring-4 ring-blue-500 ring-offset-2 animate-pulse !border-blue-500'
          : selected && isEdit
          ? 'ring-2 ring-blue-500 ring-offset-1'
          : ''
      }`}
    >
      {/* Resizer control in edit mode */}
      <NodeResizer
        isVisible={!!selected && isEdit}
        minWidth={90}
        minHeight={45}
        lineClassName="!border-blue-400"
        handleClassName="!w-3 !h-3 sm:!w-2.5 sm:!h-2.5 !bg-blue-500 !border-white"
      />

      {/* Delete button when selected in edit mode */}
      {isEdit && selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            d.onDeleteNode?.(id);
          }}
          className="absolute -top-2.5 -right-2.5 w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md nodrag nopan z-20 transition-transform hover:scale-110"
          title="Delete block"
        >
          <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
        </button>
      )}

      {/* Target & Source handles on all 4 sides for easy arrow connections with touch hit area */}
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <Handle type="target" position={Position.Left} id="left-target" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right-source" className={handleClass} />

      {d.mode === 'recall' ? (
        <div className="w-full flex flex-col items-center gap-1 nodrag nopan">
          <input
            type="text"
            value={d.recallValue ?? ''}
            onChange={(e) => {
              e.stopPropagation();
              d.onRecallInput?.(id, e.target.value);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Name this block..."
            className="w-full text-center bg-white/80 dark:bg-stone-900/80 rounded px-1.5 py-1 border border-violet-300 dark:border-violet-700 outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm sm:text-xs font-semibold focus:ring-1 focus:ring-violet-500"
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
      ) : (
        <input
          type="text"
          value={d.label}
          onChange={(e) => d.onLabelChange?.(id, e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full text-center bg-transparent outline-none font-medium text-sm sm:text-xs break-words nodrag"
        />
      )}
    </div>
  );
};

// ─── Custom Group Container Node (Box inside Box) ──────────────────────────────

const GroupNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as unknown as CustomNodeData;
  const isEdit = d.mode === 'edit';
  const isConnectSource = !!d.isConnectSource;

  const handleClass =
    "!w-3 !h-3 sm:!w-2 sm:!h-2 !bg-stone-400 hover:!bg-purple-500 transition-transform hover:scale-125 after:content-[''] after:absolute after:-inset-3.5 after:bg-transparent";

  return (
    <div
      className={`relative w-full h-full min-w-[220px] min-h-[140px] rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/40 dark:bg-stone-900/40 p-2.5 transition-all ${
        isConnectSource
          ? 'ring-4 ring-purple-500 ring-offset-2 animate-pulse !border-purple-500'
          : selected && isEdit
          ? 'ring-2 ring-purple-500'
          : ''
      }`}
    >
      <NodeResizer
        isVisible={!!selected && isEdit}
        minWidth={160}
        minHeight={100}
        lineClassName="!border-purple-400"
        handleClassName="!w-3 !h-3 sm:!w-2.5 sm:!h-2.5 !bg-purple-500 !border-white"
      />

      {/* Delete button when container is selected in edit mode */}
      {isEdit && selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            d.onDeleteNode?.(id);
          }}
          className="absolute -top-2.5 -right-2.5 w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md nodrag nopan z-20 transition-transform hover:scale-110"
          title="Delete container"
        >
          <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
        </button>
      )}

      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <Handle type="target" position={Position.Left} id="group-left" className={handleClass} />
      <Handle type="source" position={Position.Right} id="group-right" className={handleClass} />

      {/* Group header title */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-stone-200/60 dark:border-stone-800 nodrag nopan">
        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500 font-mono">
          GROUP
        </span>
        {isEdit ? (
          <input
            type="text"
            value={d.label}
            onChange={(e) => d.onLabelChange?.(id, e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-sm sm:text-xs font-semibold bg-transparent outline-none text-stone-700 dark:text-stone-300 w-full nodrag"
            placeholder="Group Title (e.g. Backend Cluster)"
          />
        ) : d.mode === 'recall' ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={d.recallValue ?? ''}
              onChange={(e) => {
                e.stopPropagation();
                d.onRecallInput?.(id, e.target.value);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-sm sm:text-xs font-semibold bg-white/80 dark:bg-stone-900/80 rounded px-1 py-0.5 border border-purple-300 dark:border-purple-700 outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 w-full"
              placeholder="Name group..."
            />
            {d.recallResult === 'correct' && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">✓</span>
            )}
            {d.recallResult === 'incorrect' && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">✗ {d.label}</span>
            )}
          </div>
        ) : (
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">{d.label}</span>
        )}
      </div>
    </div>
  );
};

// ─── Custom Editable & Deletable Edge ──────────────────────────────────────────

interface CustomEdgeData {
  mode: 'edit' | 'recall' | 'build';
  onLabelChange?: (id: string, label: string) => void;
  onDeleteEdge?: (id: string) => void;
}

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const d = data as unknown as CustomEdgeData | undefined;
  const isEdit = d?.mode !== 'recall';
  const currentLabel = (label as string) ?? '';

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#3b82f6' : (style.stroke ?? '#78716c'),
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1 bg-white/95 dark:bg-stone-800/95 border border-stone-200 dark:border-stone-700 shadow-sm rounded px-1.5 py-0.5 z-10 transition-transform hover:scale-105"
        >
          {isEdit ? (
            <>
              <input
                type="text"
                value={currentLabel}
                onChange={(e) => {
                  e.stopPropagation();
                  d?.onLabelChange?.(id, e.target.value);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="label..."
                className="text-[10px] font-mono bg-transparent outline-none text-stone-700 dark:text-stone-300 w-16 text-center focus:w-24 transition-all"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  d?.onDeleteEdge?.(id);
                }}
                className="w-5 h-5 sm:w-3.5 sm:h-3.5 rounded-full bg-stone-200 hover:bg-rose-500 hover:text-white dark:bg-stone-700 text-stone-500 flex items-center justify-center transition-colors touch-manipulation"
                title="Delete arrow"
              >
                <X className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
              </button>
            </>
          ) : (
            currentLabel && (
              <span className="text-[10px] font-mono text-stone-600 dark:text-stone-300 px-1">
                {currentLabel}
              </span>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  input: CustomNode,
  output: CustomNode,
  default: CustomNode,
  group: GroupNode,
};

const edgeTypes = {
  default: CustomEdge,
};

// ─── Inner canvas (needs ReactFlowProvider context) ─────────────────────────

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  mode: 'edit' | 'recall' | 'build';
  onNodeClick?: (e: React.MouseEvent, node: Node) => void;
  onPaneClick?: () => void;
  connectSourceId?: string | null;
  fitViewTrigger?: number;
}

const defaultEdgeOptions = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: '#78716c',
  },
  style: {
    strokeWidth: 2,
    stroke: '#78716c',
  },
};

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  mode,
  onNodeClick,
  onPaneClick,
  connectSourceId,
  fitViewTrigger,
}) => {
  const { fitView } = useReactFlow();
  useEffect(() => { setTimeout(() => fitView({ padding: 0.15 }), 50); }, []);
  useEffect(() => {
    if (fitViewTrigger) {
      fitView({ padding: 0.15, duration: 250 });
    }
  }, [fitViewTrigger, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionMode={ConnectionMode.Loose}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      nodesDraggable={mode !== 'recall' && !connectSourceId}
      nodesConnectable={mode !== 'recall'}
      elementsSelectable={mode !== 'recall'}
      panOnDrag
      zoomOnPinch
      preventScrolling
      className="bg-stone-50 dark:bg-stone-900 touch-none select-none"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="[&>button]:bg-white [&>button]:dark:bg-stone-800 [&>button]:border-stone-200 [&>button]:dark:border-stone-700 !shadow-sm !rounded-lg"
      />
      <MiniMap
        className="hidden sm:block !bg-stone-100 dark:!bg-stone-800 !border-stone-200 dark:!border-stone-700 !rounded-lg !shadow-sm"
        nodeColor={(n) =>
          n.type === 'input'
            ? '#6ee7b7'
            : n.type === 'output'
            ? '#fca5a5'
            : n.type === 'group'
            ? '#c084fc'
            : '#d6d3d1'
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

  const [mode, setMode] = useState<'edit' | 'recall' | 'build'>('edit');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [recallInputs, setRecallInputs] = useState<Record<string, string>>({});
  const [recallResults, setRecallResults] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [recallChecked, setRecallChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState(diagram.name);
  const nextId = useRef(1000);

  // ─── Mobile, Fullscreen & Tap-to-Connect State ───
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [showMobileMore, setShowMobileMore] = useState(false);

  // ─── Build / Reconstruction from Scratch State ───
  const [unlockedNodeIds, setUnlockedNodeIds] = useState<Set<string>>(new Set());
  const [buildInputText, setBuildInputText] = useState('');
  const [buildFeedbackMsg, setBuildFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [buildEvalResult, setBuildEvalResult] = useState<{
    evaluated: boolean;
    missingConnections: string[];
    correctCount: number;
    totalExpected: number;
  } | null>(null);

  // Reference to original labels for answer checking in Recall Mode
  const originalLabelsRef = useRef<Record<string, string>>({});

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id && n.parentId !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    if (connectSourceId === id) setConnectSourceId(null);
    setRecallInputs((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setRecallResults((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, [selectedNodeId, connectSourceId]);

  const handleDeleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleEdgeLabelChange = useCallback((id: string, label: string) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, label } : e)));
  }, []);

  // Keep recall inputs responsive without resetting nodes
  const handleRecallInputUpdate = useCallback((id: string, value: string) => {
    setRecallInputs((prev) => ({ ...prev, [id]: value }));
    setNodes((prev) =>
      prev.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                recallValue: value,
              },
            }
          : node
      )
    );
  }, []);

  // Build nodes with callbacks injected into data
  const buildDisplayNodes = useCallback(
    (
      baseNodes: Node[],
      currentMode: 'edit' | 'recall' | 'build',
      inputs: Record<string, string>,
      results: Record<string, 'correct' | 'incorrect' | null>,
      activeSourceId?: string | null
    ): Node[] => {
      return baseNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          mode: currentMode,
          isConnectSource: n.id === activeSourceId,
          recallValue: inputs[n.id] ?? '',
          recallResult: results[n.id] ?? null,
          onLabelChange: (id: string, label: string) => {
            originalLabelsRef.current[id] = label;
            setNodes((prev) => prev.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node));
          },
          onRecallInput: handleRecallInputUpdate,
          onDeleteNode: handleDeleteNode,
        },
      }));
    },
    [handleDeleteNode, handleRecallInputUpdate]
  );

  // Sync connectSource glow highlight onto active nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isConnectSource: n.id === connectSourceId,
        },
      }))
    );
  }, [connectSourceId]);

  // Connect helper for Tap-to-Connect on touch screens
  const createConnection = useCallback(
    (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId) {
        setConnectSourceId(null);
        return;
      }
      const alreadyConnected = edges.some(
        (e) => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId)
      );
      if (alreadyConnected) {
        setConnectSourceId(null);
        return;
      }
      const edgeId = `e${sourceId}-${targetId}-${Date.now()}`;
      setEdges((eds) =>
        addEdge(
          {
            id: edgeId,
            source: sourceId,
            target: targetId,
            label: '',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: '#78716c',
            },
            style: {
              strokeWidth: 2,
              stroke: '#78716c',
            },
            data: {
              mode,
              onLabelChange: handleEdgeLabelChange,
              onDeleteEdge: handleDeleteEdge,
            },
          },
          eds
        )
      );
      setConnectSourceId(null);
    },
    [edges, mode, handleEdgeLabelChange, handleDeleteEdge]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, clickedNode: Node) => {
      if (mode === 'recall') return;

      if (connectSourceId) {
        if (connectSourceId === '__pending__') {
          setConnectSourceId(clickedNode.id);
        } else if (connectSourceId !== clickedNode.id) {
          createConnection(connectSourceId, clickedNode.id);
        } else {
          setConnectSourceId(null);
        }
        return;
      }

      setSelectedNodeId(clickedNode.id);
    },
    [mode, connectSourceId, createConnection]
  );

  const handlePaneClick = useCallback(() => {
    if (connectSourceId) {
      setConnectSourceId(null);
    }
    setSelectedNodeId(null);
    setShowMobileMore(false);
  }, [connectSourceId]);

  // Build edges with callbacks injected into data
  const buildDisplayEdges = useCallback(
    (baseEdges: Edge[], currentMode: 'edit' | 'recall' | 'build'): Edge[] => {
      return baseEdges.map((e) => ({
        ...e,
        markerEnd: e.markerEnd || {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: '#78716c',
        },
        style: e.style || { strokeWidth: 2, stroke: '#78716c' },
        data: {
          ...e.data,
          mode: currentMode,
          onLabelChange: handleEdgeLabelChange,
          onDeleteEdge: handleDeleteEdge,
        },
      }));
    },
    [handleEdgeLabelChange, handleDeleteEdge]
  );

  useEffect(() => {
    const baseNodes = parseNodes(diagram.nodes_json);
    const baseEdges = parseEdges(diagram.edges_json);
    // Cache original labels
    const labelMap: Record<string, string> = {};
    baseNodes.forEach((n) => {
      labelMap[n.id] = (n.data?.label as string) || '';
    });
    originalLabelsRef.current = labelMap;

    setNodes(buildDisplayNodes(baseNodes, mode, recallInputs, recallResults, connectSourceId));
    setEdges(buildDisplayEdges(baseEdges, mode));
  }, [diagram]);

  // When switching modes or unlocking nodes in Build Mode, update nodes and edges
  useEffect(() => {
    if (mode === 'build') {
      const baseNodes = parseNodes(diagram.nodes_json);
      // Filter only unlocked nodes
      const visibleNodes = baseNodes.filter((n) => unlockedNodeIds.has(n.id));
      setNodes(buildDisplayNodes(visibleNodes, 'build', {}, {}, connectSourceId));
      return;
    }

    if (mode === 'edit' && nodes.length === 0) {
      const baseNodes = parseNodes(diagram.nodes_json);
      const baseEdges = parseEdges(diagram.edges_json);
      setNodes(buildDisplayNodes(baseNodes, 'edit', {}, {}));
      setEdges(buildDisplayEdges(baseEdges, 'edit'));
      return;
    }

    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          mode,
          recallValue: recallInputs[n.id] ?? '',
          recallResult: recallResults[n.id] ?? null,
          onLabelChange: (id: string, label: string) => {
            originalLabelsRef.current[id] = label;
            setNodes((current) =>
              current.map((node) =>
                node.id === id ? { ...node, data: { ...node.data, label } } : node
              )
            );
          },
          onRecallInput: handleRecallInputUpdate,
          onDeleteNode: handleDeleteNode,
        },
      }))
    );
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        data: {
          ...e.data,
          mode: mode === 'recall' ? 'recall' : 'edit',
          onLabelChange: handleEdgeLabelChange,
          onDeleteEdge: handleDeleteEdge,
        },
      }))
    );
  }, [mode, unlockedNodeIds, recallResults, handleDeleteNode, handleEdgeLabelChange, handleDeleteEdge, handleRecallInputUpdate]);

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
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            label: '',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: '#78716c',
            },
            style: {
              strokeWidth: 2,
              stroke: '#78716c',
            },
            data: {
              mode,
              onLabelChange: handleEdgeLabelChange,
              onDeleteEdge: handleDeleteEdge,
            },
          },
          eds
        )
      );
    },
    [mode, handleEdgeLabelChange, handleDeleteEdge]
  );

  const addNode = (type: 'default' | 'group' = 'default') => {
    const id = `n${nextId.current++}`;
    if (type === 'group') {
      const newGroup: Node = {
        id,
        type: 'group',
        position: { x: 100 + Math.random() * 40, y: nodes.length * 80 },
        style: { width: 340, height: 220 },
        data: { label: 'Container Box' },
      };
      setNodes((prev) => buildDisplayNodes([newGroup, ...prev], mode, recallInputs, recallResults));
      return;
    }

    const newNode: Node = {
      id,
      type: 'default',
      position: { x: 250 + Math.random() * 60 - 30, y: nodes.length * 120 },
      data: { label: 'New Block' },
    };
    setNodes((prev) => buildDisplayNodes([...prev, newNode], mode, recallInputs, recallResults));
  };

  const addNestedNode = (parentId: string) => {
    const id = `n${nextId.current++}`;
    const newNode: Node = {
      id,
      type: 'default',
      parentId,
      extent: 'parent',
      position: { x: 30 + Math.random() * 30, y: 50 + Math.random() * 40 },
      data: { label: 'Inner Block' },
    };
    setNodes((prev) => buildDisplayNodes([...prev, newNode], mode, recallInputs, recallResults));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Strip injected callback data before saving, keeping styles, dimensions, parentId, extent
      const cleanNodes = nodes.map(({ data, ...rest }) => ({
        ...rest,
        data: { label: (data as any).label },
      }));
      // Ensure all edges have markerEnd arrow
      const cleanEdges = edges.map((e) => ({
        ...e,
        markerEnd: e.markerEnd || {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: '#78716c',
        },
        style: e.style || { strokeWidth: 2, stroke: '#78716c' },
      }));
      const saved = await saveFlowDiagram(
        topicId,
        diagram.id,
        JSON.stringify(cleanNodes),
        JSON.stringify(cleanEdges),
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

  // ─── Build from Scratch Mode Handlers ───
  const enterBuildMode = () => {
    setUnlockedNodeIds(new Set());
    setBuildInputText('');
    setBuildFeedbackMsg(null);
    setBuildEvalResult(null);
    setEdges([]);
    setMode('build');
  };

  const handleBuildTypeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = buildInputText.trim().toLowerCase();
    if (!query) return;

    const baseNodes = parseNodes(diagram.nodes_json);
    // Find matching unrevealed node
    const match = baseNodes.find((n) => {
      const lbl = ((n.data?.label as string) || '').trim().toLowerCase();
      // Match exact label or partial without punctuation
      const cleanLbl = lbl.replace(/[^a-z0-9]/g, '');
      const cleanQuery = query.replace(/[^a-z0-9]/g, '');
      return (lbl === query || cleanLbl === cleanQuery) && !unlockedNodeIds.has(n.id);
    });

    if (match) {
      const updated = new Set(unlockedNodeIds);
      // If child node inside container, unlock container as well so it renders properly
      if (match.parentId && !updated.has(match.parentId)) {
        updated.add(match.parentId);
      }
      updated.add(match.id);
      setUnlockedNodeIds(updated);
      setBuildInputText('');
      setBuildFeedbackMsg({
        type: 'success',
        text: `Unlocked: "${match.data?.label || match.id}"!`,
      });
      setTimeout(() => setBuildFeedbackMsg(null), 3000);
    } else {
      // Check if already unlocked
      const already = baseNodes.find((n) => {
        const lbl = ((n.data?.label as string) || '').trim().toLowerCase();
        return lbl === query && unlockedNodeIds.has(n.id);
      });
      if (already) {
        setBuildFeedbackMsg({
          type: 'info',
          text: `"${already.data?.label}" is already on canvas.`,
        });
      } else {
        setBuildFeedbackMsg({
          type: 'error',
          text: `"${buildInputText}" does not match any missing box. Check spelling.`,
        });
      }
      setTimeout(() => setBuildFeedbackMsg(null), 3000);
    }
  };

  const handleEvaluateBuild = () => {
    const expectedEdges = parseEdges(diagram.edges_json);
    const expectedNodes = parseNodes(diagram.nodes_json);

    // Check which expected relationships exist in user's drawn edges
    const missing: string[] = [];
    let correctCount = 0;

    expectedEdges.forEach((exp) => {
      const sourceNode = expectedNodes.find((n) => n.id === exp.source);
      const targetNode = expectedNodes.find((n) => n.id === exp.target);
      const sourceName = sourceNode?.data?.label || exp.source;
      const targetName = targetNode?.data?.label || exp.target;

      // Check if user drew this connection
      const userHasEdge = edges.some(
        (ue) => ue.source === exp.source && ue.target === exp.target
      );

      if (userHasEdge) {
        correctCount++;
      } else {
        missing.push(`${sourceName} → ${targetName}`);
      }
    });

    setBuildEvalResult({
      evaluated: true,
      correctCount,
      totalExpected: expectedEdges.length,
      missingConnections: missing,
    });
  };

  const checkRecall = () => {
    const results: Record<string, 'correct' | 'incorrect'> = {};
    nodes.forEach((n) => {
      const correctLabel = (originalLabelsRef.current[n.id] || (n.data as any).label || '')
        .trim()
        .toLowerCase();
      const userInput = (recallInputs[n.id] ?? '').trim().toLowerCase();
      results[n.id] = userInput.length > 0 && userInput === correctLabel ? 'correct' : 'incorrect';
    });
    setRecallResults(results);
    setRecallChecked(true);
  };

  const correctCount = recallChecked
    ? Object.values(recallResults).filter((v) => v === 'correct').length
    : 0;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      className={`flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'h-full'
      }`}
    >
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-900/90 shrink-0">
        {/* Left: Back / Close & Title */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={isFullscreen ? () => setIsFullscreen(false) : onClose}
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Back to Diagrams'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-transparent outline-none text-stone-900 dark:text-stone-100 border-b border-transparent hover:border-stone-300 dark:hover:border-stone-600 focus:border-stone-400 dark:focus:border-stone-500 transition-colors px-0.5 truncate max-w-[110px] sm:max-w-[200px]"
          />
        </div>

        {/* Center / Right: Mode Switcher & Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Segmented Mode Selector */}
          <div className="flex p-0.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-xs font-medium shrink-0">
            <button
              onClick={() => {
                if (mode === 'build') {
                  const baseNodes = parseNodes(diagram.nodes_json);
                  const baseEdges = parseEdges(diagram.edges_json);
                  setNodes(buildDisplayNodes(baseNodes, 'edit', {}, {}));
                  setEdges(buildDisplayEdges(baseEdges, 'edit'));
                }
                setMode('edit');
                setRecallInputs({});
                setRecallResults({});
                setRecallChecked(false);
                setConnectSourceId(null);
              }}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                mode === 'edit'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
              title="Edit diagram blocks, labels and arrows"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={enterRecall}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                mode === 'recall'
                  ? 'bg-white dark:bg-stone-900 text-violet-700 dark:text-violet-300 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
              title="Quiz yourself by typing labels into blank blocks"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fill</span>
            </button>
            <button
              onClick={enterBuildMode}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                mode === 'build'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
              title="Start with a blank canvas and reconstruct the diagram"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Build</span>
            </button>
          </div>

          {/* Mode-Specific Action Buttons */}
          {mode === 'edit' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => addNode('default')}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors shrink-0"
                title="Add a block"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Block</span>
              </button>

              <button
                onClick={() => setConnectSourceId((prev) => (prev ? null : selectedNodeId || '__pending__'))}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                  connectSourceId
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
                }`}
                title="Tap-to-Connect: tap source box, then tap destination box to create arrow"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Connect</span>
              </button>

              {/* Desktop Container Buttons */}
              <div className="hidden lg:flex items-center gap-1">
                <button
                  onClick={() => addNode('group')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition-colors"
                  title="Add an outer container box"
                >
                  <BoxSelect className="w-3.5 h-3.5" />
                  <span>Container</span>
                </button>
                {nodes.some((n) => n.type === 'group') && (
                  <button
                    onClick={() => {
                      const firstGroup = nodes.find((n) => n.type === 'group');
                      if (firstGroup) addNestedNode(firstGroup.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 hover:bg-purple-200 transition-colors"
                    title="Nest a block inside container"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nest Box</span>
                  </button>
                )}
              </div>

              {/* Mobile More Popover for Containers */}
              <div className="relative lg:hidden">
                <button
                  onClick={() => setShowMobileMore((prev) => !prev)}
                  className="p-1.5 rounded text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                  title="More actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMobileMore && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl py-1 z-40 text-xs">
                    <button
                      onClick={() => {
                        addNode('group');
                        setShowMobileMore(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 text-stone-700 dark:text-stone-200"
                    >
                      <BoxSelect className="w-3.5 h-3.5 text-purple-600" />
                      <span>+ Outer Container</span>
                    </button>
                    {nodes.some((n) => n.type === 'group') && (
                      <button
                        onClick={() => {
                          const firstGroup = nodes.find((n) => n.type === 'group');
                          if (firstGroup) addNestedNode(firstGroup.id);
                          setShowMobileMore(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 text-stone-700 dark:text-stone-200"
                      >
                        <Plus className="w-3.5 h-3.5 text-purple-600" />
                        <span>+ Nest Box in Container</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white transition-colors disabled:opacity-50 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{saveMsg ?? (isSaving ? 'Saving…' : 'Save')}</span>
              </button>
            </div>
          )}

          {mode === 'recall' && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {recallChecked && (
                <span className="text-xs font-mono font-semibold text-stone-600 dark:text-stone-300 px-1 sm:px-2">
                  {correctCount}/{nodes.length}
                </span>
              )}
              {!recallChecked ? (
                <button
                  onClick={checkRecall}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-violet-600 dark:bg-violet-700 text-white hover:bg-violet-700 transition-colors shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Check</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setRecallInputs({});
                    setRecallResults({});
                    setRecallChecked(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Try Again</span>
                </button>
              )}
            </div>
          )}

          {mode === 'build' && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleEvaluateBuild}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Check</span>
              </button>
              <button
                onClick={() => setConnectSourceId((prev) => (prev ? null : selectedNodeId || '__pending__'))}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                  connectSourceId
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
                }`}
                title="Tap-to-Connect arrows between revealed blocks"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect</span>
              </button>
              <button
                onClick={enterBuildMode}
                className="p-1.5 rounded text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors shrink-0"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Recenter / Fit View Button */}
          <button
            onClick={() => setFitViewTrigger((c) => c + 1)}
            className="p-1.5 rounded text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors shrink-0"
            title="Recenter & Fit Diagram"
          >
            <Focus className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen / Maximize View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode banners */}
      {mode === 'recall' && (
        <div className="px-3 sm:px-4 py-1.5 bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-800 text-[11px] sm:text-xs text-violet-700 dark:text-violet-300 flex items-center gap-2 shrink-0">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span><strong>Fill Labels Mode:</strong> Type the name of each block from memory, then click "Check".</span>
        </div>
      )}

      {mode === 'build' && (
        <div className="px-3 sm:px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Hammer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-900 dark:text-amber-200 truncate text-[11px] sm:text-xs">
                Build from Scratch: Type box name to reveal it
              </span>
            </div>
            <div className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
              {unlockedNodeIds.size} / {parseNodes(diagram.nodes_json).length}
            </div>
          </div>

          {/* Text Input to spawn boxes */}
          <form onSubmit={handleBuildTypeSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={buildInputText}
              onChange={(e) => setBuildInputText(e.target.value)}
              placeholder="Type box name (e.g. HDFS, Parser, Hadoop)..."
              className="flex-1 px-2.5 py-1.5 text-sm sm:text-xs rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
            <button
              type="submit"
              disabled={!buildInputText.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors shrink-0"
            >
              Reveal
            </button>
          </form>

          {/* Feedback messages */}
          {buildFeedbackMsg && (
            <div
              className={`text-[11px] font-medium flex items-center gap-1.5 ${
                buildFeedbackMsg.type === 'success'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : buildFeedbackMsg.type === 'info'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {buildFeedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{buildFeedbackMsg.text}</span>
            </div>
          )}

          {/* Evaluation Results Banner */}
          {buildEvalResult?.evaluated && (
            <div className="p-2 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs space-y-1 max-h-32 overflow-y-auto">
              <div className="font-semibold flex items-center gap-1.5 text-stone-900 dark:text-stone-100 text-[11px] sm:text-xs">
                {buildEvalResult.correctCount === buildEvalResult.totalExpected ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Perfect! All {buildEvalResult.totalExpected} relationships correctly connected!
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {buildEvalResult.correctCount} of {buildEvalResult.totalExpected} connections correct.
                  </span>
                )}
              </div>
              {buildEvalResult.missingConnections.length > 0 && (
                <div className="text-rose-600 dark:text-rose-400 text-[10px] sm:text-[11px]">
                  <strong>Missing:</strong> {buildEvalResult.missingConnections.join('; ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Canvas Viewport */}
      <div className="flex-1 min-h-0 relative">
        <ReactFlowProvider>
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            mode={mode}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            connectSourceId={connectSourceId}
            fitViewTrigger={fitViewTrigger}
          />
        </ReactFlowProvider>

        {/* Floating Tap-to-Connect Status Banner */}
        {connectSourceId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2 max-w-[94vw] border border-blue-400/40">
            <Link2 className="w-4 h-4 shrink-0 animate-pulse" />
            <span className="truncate">
              {connectSourceId === '__pending__'
                ? 'Tap any block to start arrow'
                : `From: ${((nodes.find((n) => n.id === connectSourceId)?.data as any)?.label as string) || 'block'} → Tap target`}
            </span>
            <button
              onClick={() => setConnectSourceId(null)}
              className="ml-1 p-0.5 rounded-full hover:bg-blue-700 text-blue-200 hover:text-white shrink-0"
              title="Cancel connection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Quick Action Card for Selected Node (Mobile & Desktop) */}
        {selectedNode && !connectSourceId && mode !== 'recall' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-white/95 dark:bg-stone-800/95 border border-stone-200 dark:border-stone-700 shadow-xl flex items-center gap-2 max-w-[92vw] text-xs backdrop-blur-xs">
            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[110px] pl-1">
              {((selectedNode.data as any)?.label as string) || (selectedNode.type === 'group' ? 'Container' : 'Block')}
            </span>
            <div className="h-3.5 w-px bg-stone-200 dark:bg-stone-700 shrink-0" />
            <button
              onClick={() => setConnectSourceId(selectedNode.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors shrink-0 font-medium"
              title="Start drawing arrow from this block"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
            <button
              onClick={() => {
                handleDeleteNode(selectedNode.id);
                setSelectedNodeId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors shrink-0 font-medium"
              title="Delete this block"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Edit mode hint (desktop only to preserve mobile screen real estate) */}
      {mode === 'edit' && (
        <div className="hidden sm:flex px-4 py-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400 dark:text-stone-500 shrink-0 items-center gap-3 flex-wrap">
          <span>• <strong>Add arrow:</strong> Drag from any dot OR click <em>Connect</em> and tap 2 blocks</span>
          <span>• <strong>Arrow label / delete:</strong> Type in arrow tag or click ✕</span>
          <span>• <strong>Delete block:</strong> Select any box and click ✕ or Delete</span>
          <span>• <strong>Boxes in boxes:</strong> Click <em>Container</em>, then <em>Nest Box</em></span>
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
  const [createMode, setCreateMode] = useState<'prompt' | 'image'>('prompt');
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setGenError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setGenError('Image file is too large. Please select an image under 10MB.');
      return;
    }

    setGenError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setSelectedImageBase64(result);
      if (!newName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewName(cleanName || `${topicTitle} ER Diagram`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!newName.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      let diagram: FlowDiagram;
      if (createMode === 'image') {
        if (!selectedImageBase64) {
          setGenError('Please upload an image first.');
          setIsGenerating(false);
          return;
        }
        diagram = await createDiagramFromImage(topicId, newName.trim(), selectedImageBase64);
      } else {
        if (!newPrompt.trim()) {
          setGenError('Please describe the architecture or flow.');
          setIsGenerating(false);
          return;
        }
        diagram = await generateFlowDiagram(topicId, newName.trim(), newPrompt.trim());
      }

      setDiagrams((prev) => [...prev, diagram]);
      setActiveDiagram(diagram);
      setShowCreateForm(false);
      setNewName('');
      setNewPrompt('');
      setSelectedImageBase64(null);
      setImagePreview(null);
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
              Create Flow / Architecture Diagram
            </span>
            <button onClick={() => setShowCreateForm(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher: Prompt vs Upload Image */}
          <div className="flex p-0.5 rounded-lg bg-stone-200/70 dark:bg-stone-800 text-xs font-medium max-w-sm">
            <button
              onClick={() => { setCreateMode('prompt'); setGenError(null); }}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                createMode === 'prompt'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Prompt Architecture
            </button>
            <button
              onClick={() => { setCreateMode('image'); setGenError(null); }}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                createMode === 'image'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload Diagram Photo
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
              placeholder={createMode === 'image' ? 'e.g. E-Commerce ER Diagram' : 'e.g. TCP Handshake'}
              className="w-full px-3 py-2 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
            />
          </div>

          {createMode === 'prompt' ? (
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
          ) : (
            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Upload ER / Architecture Photo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-3 bg-white dark:bg-stone-800 flex flex-col items-center gap-2">
                  <img
                    src={imagePreview}
                    alt="Uploaded Diagram"
                    className="max-h-56 object-contain rounded border border-stone-200 dark:border-stone-700 shadow-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs rounded bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 transition-colors"
                    >
                      Change Image
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImageBase64(null);
                        setImagePreview(null);
                      }}
                      className="px-2.5 py-1 text-xs rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-violet-500 dark:hover:border-violet-400 rounded-lg p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors bg-white dark:bg-stone-800/60"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Click to upload diagram photo
                    </span>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Supports PNG, JPG, or WebP (ER diagrams, database schemas, flowcharts)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {genError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded px-3 py-2">
              {genError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                !newName.trim() ||
                (createMode === 'prompt' && !newPrompt.trim()) ||
                (createMode === 'image' && !selectedImageBase64)
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating
                ? createMode === 'image'
                  ? 'Analyzing & Recreating…'
                  : 'Generating…'
                : createMode === 'image'
                ? 'Recreate from Photo'
                : 'Generate Diagram'}
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
