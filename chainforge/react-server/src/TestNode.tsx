import React, { useState, useEffect, useContext, useRef } from "react";
import { Handle, Position } from "reactflow";
import useStore from "./store";
import BaseNode from "./BaseNode";
import NodeLabel from "./NodeLabelComponent";
import LLMResponseInspector, { exportToExcel } from "./LLMResponseInspector";
import { grabResponses } from "./backend/backend";
import { LLMResponse } from "./backend/typing";
import { AlertModalContext } from "./AlertModal";
import ResizeHandle from "./ResizeHandle";

export interface TestNodeProps {
  data: {
    title: string;
    input: string;
    refresh: boolean;
  };
  id: string;
}

const TestNode: React.FC<TestNodeProps> = ({ data, id }) => {
  const totalMissingLLMs = useStore((state) => {
    return state.nodes.reduce((sum, node) => {
      const missing = node.data?.totalMissingQueries ?? 0;
      return sum + missing;
    }, 0);
  });

  return (
   <BaseNode classNames="test-node" nodeId={id}>
      <NodeLabel
        title={data.title || "Test Node"}
        nodeId={id}
        icon="🧪"
      />
      <div style={{ padding: "12px", color: "#fff", minWidth: "180px" }}>
        <div style={{ fontSize: "12px", opacity: 0.8 }}>
          missing LLMs across all nodes
        </div>
        <div style={{ 
          fontSize: "24px", 
          fontWeight: "bold", 
          color: totalMissingLLMs > 0 ? "#ff4d4f" : "#52c41a",
          marginTop: "4px" 
        }}>
          {totalMissingLLMs}
        </div>
      </div>
   </BaseNode>
  );
};

export default TestNode;
