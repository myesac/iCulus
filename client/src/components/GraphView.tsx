// ----------------------------------------------------------------------------------
//  Name:    GraphView.tsx
//  Author:  Mark Casey
//
//  Purpose: SVG graph renderer. Draws account and contact nodes, their edges, and
//           handles node dragging, selection and the empty state.
//
//  Features:
//   • <GraphView /> → interactive graph component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { Account, Contact, ContactLink, LayoutKind } from '../types';
import {
  GRAPH_H,
  GRAPH_W,
  layoutPositions,
  MAIN_RADIUS,
  SUB_RADIUS,
  type Point,
} from '../graph/layout';
import { useForceLayout } from '../graph/useForceLayout';

// ── Types ──────────────────────────────────────────────────
interface GraphViewProps {
  accounts:        Account[];
  contacts:        Contact[];
  links:           ContactLink[];
  selectedMainId:  string | null;
  selectedSubId:   string | null;
  layout:          LayoutKind;
  onSelectMain:    (id: string) => void;
  onSelectSub:     (id: string) => void;
  onClearSelection: () => void;
  onAddAccount:    () => void;
  onAddContact:    (accountId: string) => void;
}

interface DragState {
  id:     string;
  dx:     number;
  dy:     number;
  startX: number;
  startY: number;
  moved:  boolean;
}

interface RenderEdge {
  key:       string;
  x1:        number;
  y1:        number;
  x2:        number;
  y2:        number;
  collapsed: boolean;
  kind:      'auto' | 'manual' | 'meta';
}

// ══ Helpers ════════════════════════════════════════════════
function edgePath(x1: number, y1: number, x2: number, y2: number): string {

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(70, len * 0.22);
  const ox = -dy / len;
  const oy = dx / len;

  return `M ${x1} ${y1} Q ${mx + ox * bend} ${my + oy * bend} ${x2} ${y2}`;
}

function initials(name: string): string {

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {

    return '?';
  }

  if (parts.length === 1) {

    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ══ Component ══════════════════════════════════════════════
export function GraphView({
  accounts,
  contacts,
  links,
  selectedMainId,
  selectedSubId,
  layout,
  onSelectMain,
  onSelectSub,
  onClearSelection,
  onAddAccount,
  onAddContact,
}: GraphViewProps) {

  const svgRef = useRef<SVGSVGElement>(null);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const visibleContacts = useMemo(
    () => (selectedMainId ? contacts.filter((c) => c.accountId === selectedMainId) : []),
    [contacts, selectedMainId],
  );

  const staticPos = useMemo(
    () => layoutPositions(layout, accounts, visibleContacts),
    [layout, accounts, visibleContacts],
  );
  const force = useForceLayout(layout === 'force', accounts, contacts, links, selectedMainId);
  const base = layout === 'force' ? force.positions : staticPos;

  const [overrides, setOverrides] = useState<Map<string, Point>>(() => new Map());

  useEffect(() => {

    setOverrides(new Map());
  }, [layout, selectedMainId]);

  const positions = useMemo(() => {

    const next = new Map(base);

    overrides.forEach((point, id) => next.set(id, point));

    return next;
  }, [base, overrides]);

  const dragRef = useRef<DragState | null>(null);
  const lastDragMovedRef = useRef(false);

  const clientToSvg = (clientX: number, clientY: number): Point => {

    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();

    if (!svg || !ctm) return { x: 0, y: 0 };

    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());

    return { x: point.x, y: point.y };
  };

  const onDragMove = (event: PointerEvent) => {

    const drag = dragRef.current;

    if (!drag) return;

    const point = clientToSvg(event.clientX, event.clientY);
    const x = point.x + drag.dx;
    const y = point.y + drag.dy;

    if (Math.hypot(x - drag.startX, y - drag.startY) > 4) drag.moved = true;

    if (layout === 'force') {

      const sim = force.simulation.current;
      const node = sim?.nodes().find((n) => n.id === drag.id);

      if (node) {

        node.fx = x;
        node.fy = y;
      }

    } else {

      setOverrides((prev) => {

        const next = new Map(prev);
        next.set(drag.id, { x, y });

        return next;
      });
    }
  };

  const onDragEnd = () => {

    const drag = dragRef.current;

    if (drag) {

      lastDragMovedRef.current = drag.moved;

      if (layout === 'force') {

        const sim = force.simulation.current;
        const node = sim?.nodes().find((n) => n.id === drag.id);

        if (node) {

          node.fx = null;
          node.fy = null;
          sim?.alphaTarget(0);
        }
      }
    }

    dragRef.current = null;

    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  };

  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, id: string) => {

    if (event.button !== 0) {

      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const point = clientToSvg(event.clientX, event.clientY);
    const current = positions.get(id);

    if (!current) {

      return;
    }

    lastDragMovedRef.current = false;

    dragRef.current = {
      id,
      dx: current.x - point.x,
      dy: current.y - point.y,
      startX: current.x,
      startY: current.y,
      moved: false,
    };

    if (layout === 'force') {

      const sim = force.simulation.current;
      const node = sim?.nodes().find((n) => n.id === id);

      if (node) {

        node.fx = current.x;
        node.fy = current.y;
        sim?.alphaTarget(0.3).restart();
      }
    }

    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  };

  const handleNodeClick = (event: ReactMouseEvent, id: string, isMain: boolean) => {

    event.stopPropagation();

    const moved = lastDragMovedRef.current;
    lastDragMovedRef.current = false;

    if (moved) {

      return;
    }

    if (isMain) onSelectMain(id);
    else onSelectSub(id);
  };

  const edges = useMemo(() => {

    const result: RenderEdge[] = [];

    if (!selectedMainId) {

      const seen = new Set<string>();

      for (const link of links) {

        const source = contactById.get(link.sourceId);
        const target = contactById.get(link.targetId);

        if (!source || !target || source.accountId === target.accountId) continue;

        const key = [source.accountId, target.accountId].sort().join('|');

        if (seen.has(key)) continue;

        seen.add(key);

        const p1 = positions.get(source.accountId);
        const p2 = positions.get(target.accountId);

        if (p1 && p2) {

          result.push({ key, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, collapsed: true, kind: 'meta' });
        }
      }

      return result;
    }

    for (const contact of visibleContacts) {

      for (const link of links) {

        if (link.sourceId !== contact.id && link.targetId !== contact.id) continue;

        const otherId = link.sourceId === contact.id ? link.targetId : link.sourceId;
        const other = contactById.get(otherId);

        if (!other || other.accountId === selectedMainId) continue;

        const from = positions.get(contact.id);
        const to = positions.get(other.accountId);

        if (from && to) {

          result.push({
            key: link.id,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            collapsed: false,
            kind: link.kind,
          });
        }
      }
    }

    return result;
  }, [selectedMainId, links, contactById, visibleContacts, positions]);

  // ── Render helpers ───────────────────────────────────────
  const renderMainNode = (account: Account) => {

    const point = positions.get(account.id);

    if (!point) return null;

    const selected = selectedMainId === account.id;
    const lowlit = selectedMainId !== null && !selected;

    return (
      <g
        key={account.id}
        className={`node main-node${selected ? ' is-selected' : ''}${lowlit ? ' is-lowlit' : ''}`}
        transform={`translate(${point.x}, ${point.y})`}
        onPointerDown={(event) => handleNodePointerDown(event, account.id)}
        onClick={(event) => handleNodeClick(event, account.id, true)}
      >
        <circle
          className="node-halo"
          r={MAIN_RADIUS + 10}
          filter={selected ? 'url(#iculus-glow)' : undefined}
        />
        <circle className="node-bubble" r={MAIN_RADIUS} style={{ fill: account.color }} />
        <circle className="node-shine" r={MAIN_RADIUS - 7} />
        <text className="node-icon node-icon-main" textAnchor="middle" dominantBaseline="central">
          {account.icon}
        </text>
        <text className="node-label node-label-main" textAnchor="middle" y={MAIN_RADIUS + 24}>
          {account.label}
        </text>
        {selected && (
          <g
            className="node-add"
            transform={`translate(${MAIN_RADIUS + 1}, ${-MAIN_RADIUS - 1})`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {

              event.stopPropagation();
              onAddContact(account.id);
            }}
          >
            <circle r={13} />
            <text textAnchor="middle" dominantBaseline="central">
              +
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderSubNode = (contact: Contact) => {

    const point = positions.get(contact.id);

    if (!point) return null;

    const account = accountById.get(contact.accountId);
    const color = account?.color ?? '#6C7A89';
    const selected = selectedSubId === contact.id;

    return (
      <g
        key={contact.id}
        className={`node sub-node${selected ? ' is-selected' : ''}`}
        transform={`translate(${point.x}, ${point.y})`}
        onPointerDown={(event) => handleNodePointerDown(event, contact.id)}
        onClick={(event) => handleNodeClick(event, contact.id, false)}
      >
        <circle
          className="node-halo"
          r={SUB_RADIUS + 9}
          filter={selected ? 'url(#iculus-glow)' : undefined}
        />
        <circle
          className="node-bubble node-bubble-sub"
          r={SUB_RADIUS}
          style={{ fill: color, stroke: color }}
        />
        <text
          className="node-icon node-icon-sub"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fill: color }}
        >
          {initials(contact.fullName)}
        </text>
        <text className="node-label node-label-sub" textAnchor="middle" y={SUB_RADIUS + 17}>
          {contact.fullName}
        </text>
      </g>
    );
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="graph-view">
      <svg
        ref={svgRef}
        className="graph-svg"
        viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="iculus-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="iculus-bubble" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
          </radialGradient>
        </defs>

        <rect
          className="graph-bg"
          x={0}
          y={0}
          width={GRAPH_W}
          height={GRAPH_H}
          onPointerDown={() => onClearSelection()}
        />

        <g className="edges-layer">
          {edges.map((edge) => (
            <path
              key={edge.key}
              className={`edge${
                edge.collapsed ? ' edge-collapsed' : edge.kind === 'auto' ? ' edge-auto' : ' edge-manual'
              }`}
              d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2)}
            />
          ))}
        </g>

        <g className="nodes-layer">
          {accounts.map(renderMainNode)}
          {visibleContacts.map(renderSubNode)}
        </g>
      </svg>

      {accounts.length === 0 && (
        <div className="graph-empty">
          <div className="graph-empty-title">Welcome to iCulus</div>
          <p>Add your first account to start building your contact graph.</p>
          <button type="button" className="btn btn-primary" onClick={onAddAccount}>
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
