import { StateGraph, START, END } from '@langchain/langgraph';
import { GraphAnnotation } from './state';
import {
  triageNode,
  assessPriorityNode,
  retrieveContextNode,
  recommendResolutionNode,
  actionNode,
} from './nodes';

const graph = new StateGraph(GraphAnnotation)
  .addNode('triage',               triageNode)
  .addNode('assessPriority',       assessPriorityNode)
  .addNode('retrieveContext',      retrieveContextNode)
  .addNode('recommendResolution',  recommendResolutionNode)
  .addNode('action',               actionNode)
  // Fan-out from triage → two parallel branches
  .addEdge(START,              'triage')
  .addEdge('triage',           'assessPriority')
  .addEdge('triage',           'retrieveContext')
  // Both branches join at recommendResolution
  .addEdge('assessPriority',   'recommendResolution')
  .addEdge('retrieveContext',  'recommendResolution')
  .addEdge('recommendResolution', 'action')
  .addEdge('action',           END);

export const analysisGraph = graph.compile();
