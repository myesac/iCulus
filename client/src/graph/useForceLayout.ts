// ----------------------------------------------------------------------------------
//  Name:    useForceLayout.ts
//  Author:  Mark Casey
//
//  Purpose: React hook that runs a d3-force simulation for the Force layout and
//           streams node positions back to the caller.
//
//  Features:
//   • ForceNode      → interface
//   • useForceLayout → hook returning positions and the simulation ref
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import type { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { Account, Contact, ContactLink } from '../types';
import {
  GRAPH_H,
  GRAPH_W,
  initialPositions,
  MAIN_RADIUS,
  SUB_RADIUS,
  type Point,
} from './layout';

// ── Types ──────────────────────────────────────────────────
export interface ForceNode extends SimulationNodeDatum {
  id:    string;
  r:     number;
  isMain: boolean;
}

// ══ Helpers ════════════════════════════════════════════════
function resolveNode(
  ref: ForceNode | string | number,
  nodeMap: Map<string, ForceNode>,
): ForceNode | undefined {

  if (typeof ref === 'object') {

    return ref ?? undefined;
  }

  return nodeMap.get(String(ref));
}

// ══ Hook ═══════════════════════════════════════════════════
export function useForceLayout(
  active: boolean,
  accounts: Account[],
  contacts: Contact[],
  links: ContactLink[],
  selectedMainId: string | null,
): {
  positions: Map<string, Point>;
  simulation: { current: Simulation<ForceNode, SimulationLinkDatum<ForceNode>> | null };
} {

  const [positions, setPositions] = useState<Map<string, Point>>(() =>
    initialPositions(accounts, []),
  );
  const simulation = useRef<Simulation<ForceNode, SimulationLinkDatum<ForceNode>> | null>(null);

  useEffect(() => {

    if (!active) {

      return;
    }

    const visible = selectedMainId ? contacts.filter((c) => c.accountId === selectedMainId) : [];
    const nodes: ForceNode[] = [
      ...accounts.map((a) => ({ id: a.id, r: MAIN_RADIUS, isMain: true })),
      ...visible.map((c) => ({ id: c.id, r: SUB_RADIUS, isMain: false })),
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const edges: SimulationLinkDatum<ForceNode>[] = [];

    for (const contact of visible) {

      edges.push({ source: contact.accountId, target: contact.id });
    }

    const visibleIds = new Set(visible.map((c) => c.id));

    for (const link of links) {

      const sourceVisible = visibleIds.has(link.sourceId);
      const targetVisible = visibleIds.has(link.targetId);

      if (sourceVisible && !targetVisible) {

        const other = contacts.find((c) => c.id === link.targetId);

        if (other) {

          edges.push({ source: link.sourceId, target: other.accountId });
        }

      } else if (targetVisible && !sourceVisible) {

        const other = contacts.find((c) => c.id === link.sourceId);

        if (other) {

          edges.push({ source: link.targetId, target: other.accountId });
        }
      }
    }

    const start = initialPositions(accounts, visible);
    const sim = forceSimulation<ForceNode>(nodes)
      .force('charge', forceManyBody<ForceNode>().strength(-340))
      .force(
        'collide',
        forceCollide<ForceNode>()
          .radius((d) => d.r + 10)
          .strength(0.9),
      )
      .force('x', forceX<ForceNode>(GRAPH_W / 2).strength(0.05))
      .force('y', forceY<ForceNode>(GRAPH_H / 2).strength(0.05))
      .force(
        'link',
        forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(edges)
          .id((d) => d.id)
          .distance((link) => {

            const s = resolveNode(link.source, nodeMap);
            const t = resolveNode(link.target, nodeMap);

            if (s?.isMain && t?.isMain) {

              return 230;
            }

            if (s?.isMain || t?.isMain) {

              return 150;
            }

            return 90;
          })
          .strength(0.35),
      )
      .stop();

    for (const node of nodes) {

      const point = start.get(node.id);

      if (point) {

        node.x = point.x;
        node.y = point.y;
      }
    }

    sim.on('tick', () => {

      const next = new Map<string, Point>();

      for (const node of nodes) {

        next.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
      }

      setPositions(next);
    });

    sim.alpha(1).restart();
    simulation.current = sim;

    return () => {

      sim.stop();
      simulation.current = null;
    };

  }, [active, accounts, contacts, links, selectedMainId]);

  return { positions, simulation };
}
