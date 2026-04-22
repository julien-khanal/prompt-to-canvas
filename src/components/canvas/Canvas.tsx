"use client";

import { useCallback, useEffect } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "@/lib/canvas/store";
import { nodeTypes } from "@/components/nodes";
import { seedEdges, seedNodes } from "@/lib/canvas/seed";
import { Toolbox, TOOLBOX_MIME } from "@/components/toolbox/Toolbox";
import { createNode } from "@/lib/canvas/factory";
import type { CanvasNodeData } from "@/lib/canvas/types";

function CanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, replaceGraph, addNode } =
    useCanvasStore();
  const graphVersion = useCanvasStore((s) => s.graphVersion);
  const { fitView, screenToFlowPosition } = useReactFlow();

  const hydrated = useCanvasStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated && nodes.length === 0) replaceGraph(seedNodes, seedEdges);
  }, [hydrated, nodes.length, replaceGraph]);

  useEffect(() => {
    if (graphVersion === 0) return;
    const t = setTimeout(() => {
      fitView({ padding: 0.2, duration: 650 });
    }, 80);
    return () => clearTimeout(t);
  }, [graphVersion, fitView]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(TOOLBOX_MIME) as CanvasNodeData["kind"];
      if (!kind) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(createNode(kind, { x: pos.x - 150, y: pos.y - 80 }));
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        minZoom={0.1}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { stroke: "url(#edge-gradient)", strokeWidth: 1.5 },
        }}
      >
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4285F4" />
              <stop offset="55%" stopColor="#9B72CB" />
              <stop offset="100%" stopColor="#D96570" />
            </linearGradient>
          </defs>
        </svg>
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.2}
          color="rgba(255,255,255,0.18)"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!rounded-2xl !border !border-white/10 !bg-[rgba(22,22,31,0.7)] !backdrop-blur-xl !shadow-none [&_button]:!bg-transparent [&_button]:!border-0 [&_button]:!text-white/70 [&_button:hover]:!text-white"
        />
        <MiniMap
          position="bottom-right"
          className="!rounded-2xl !border !border-white/10 !bg-[rgba(22,22,31,0.7)] !backdrop-blur-xl"
          maskColor="rgba(10,10,15,0.6)"
          nodeColor={() => "rgba(155,114,203,0.9)"}
          nodeStrokeColor="transparent"
          pannable
          zoomable
        />
      </ReactFlow>
      <Toolbox />
    </div>
  );
}

export function Canvas() {
  return (
    <div className="absolute inset-0">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
