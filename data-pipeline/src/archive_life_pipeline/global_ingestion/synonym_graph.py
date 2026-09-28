"""Synonym graph with typed edges, cycle detection, and accepted-name resolution."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Relation = Literal[
    "SYNONYM_OF",
    "BASIONYM_OF",
    "HISTORICAL_NAME_OF",
    "MISSPELLING_OF",
    "RECOMBINATION_OF",
    "SOURCE_ASSERTS_ACCEPTED_NAME",
]


def _norm(name: str) -> str:
    return " ".join(name.strip().lower().split())


@dataclass
class SynonymEdge:
    from_name: str
    to_name: str
    relation: Relation
    source: str
    source_version: str
    source_record_id: str
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass
class SynonymGraphReport:
    edge_count: int
    unique_names: int
    cycles_detected: list[list[str]]
    unresolved_conflicts: list[dict[str, Any]]
    accepted_resolutions_sample: list[dict[str, str]]
    integrity_pass: bool
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SynonymGraph:
    def __init__(self) -> None:
        self.edges: list[SynonymEdge] = []
        self._adj: dict[str, list[SynonymEdge]] = defaultdict(list)
        self._accepted_assertions: dict[str, set[str]] = defaultdict(set)

    def add_edge(self, edge: SynonymEdge) -> None:
        self.edges.append(edge)
        self._adj[_norm(edge.from_name)].append(edge)
        if edge.relation == "SOURCE_ASSERTS_ACCEPTED_NAME":
            self._accepted_assertions[_norm(edge.from_name)].add(_norm(edge.to_name))

    def detect_cycles(self) -> list[list[str]]:
        cycles: list[list[str]] = []
        visiting: set[str] = set()
        visited: set[str] = set()
        stack: list[str] = []

        def dfs(node: str) -> None:
            if node in visiting:
                if node in stack:
                    idx = stack.index(node)
                    cycles.append(stack[idx:] + [node])
                return
            if node in visited:
                return
            visiting.add(node)
            stack.append(node)
            for edge in self._adj.get(node, []):
                nxt = _norm(edge.to_name)
                if nxt == node:
                    continue  # self-assertion is not a cycle
                dfs(nxt)
            stack.pop()
            visiting.remove(node)
            visited.add(node)

        for node in list(self._adj.keys()):
            dfs(node)
        # Deduplicate cycles by frozenset of nodes
        uniq: list[list[str]] = []
        seen: set[frozenset[str]] = set()
        for c in cycles:
            key = frozenset(c)
            if key not in seen:
                seen.add(key)
                uniq.append(c)
        return uniq

    def resolve_accepted(self, name: str, max_hops: int = 16) -> tuple[str, list[str]]:
        path = [_norm(name)]
        current = _norm(name)
        for _ in range(max_hops):
            edges = self._adj.get(current, [])
            if not edges:
                break
            # Prefer SOURCE_ASSERTS_ACCEPTED_NAME / SYNONYM_OF
            preferred = sorted(
                edges,
                key=lambda e: 0
                if e.relation in ("SOURCE_ASSERTS_ACCEPTED_NAME", "SYNONYM_OF")
                else 1,
            )
            nxt = _norm(preferred[0].to_name)
            if nxt in path:
                break
            path.append(nxt)
            current = nxt
        return current, path

    def unresolved_conflicts(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for name, targets in self._accepted_assertions.items():
            if len(targets) > 1:
                out.append(
                    {
                        "name": name,
                        "asserted_accepted": sorted(targets),
                        "status": "UNRESOLVED",
                        "reason": "sources_assert_multiple_accepted_names",
                    }
                )
        return out


def build_synonym_graph(records: list[dict[str, Any]]) -> tuple[SynonymGraph, SynonymGraphReport]:
    g = SynonymGraph()
    for rec in records:
        source = str(rec.get("source_name") or "unknown")
        version = str(rec.get("source_version") or "unknown")
        sid = str(rec.get("source_record_id") or "")
        scientific = rec.get("scientific_name")
        accepted = rec.get("accepted_name")
        if isinstance(scientific, str) and isinstance(accepted, str) and _norm(scientific) != _norm(
            accepted
        ):
            g.add_edge(
                SynonymEdge(
                    from_name=scientific,
                    to_name=accepted,
                    relation="SYNONYM_OF",
                    source=source,
                    source_version=version,
                    source_record_id=sid,
                )
            )
        if isinstance(accepted, str):
            # Record accepted-name assertion without a self-loop adjacency edge
            g._accepted_assertions[_norm(accepted)].add(_norm(accepted))
            g.edges.append(
                SynonymEdge(
                    from_name=accepted,
                    to_name=accepted,
                    relation="SOURCE_ASSERTS_ACCEPTED_NAME",
                    source=source,
                    source_version=version,
                    source_record_id=sid,
                )
            )
        for syn in rec.get("synonyms") or []:
            if not isinstance(syn, str) or not syn.strip():
                continue
            target = accepted if isinstance(accepted, str) else scientific
            if not isinstance(target, str):
                continue
            relation: Relation = "HISTORICAL_NAME_OF"
            lower = syn.lower()
            if "misspell" in lower:
                relation = "MISSPELLING_OF"
            g.add_edge(
                SynonymEdge(
                    from_name=syn,
                    to_name=target,
                    relation=relation,
                    source=source,
                    source_version=version,
                    source_record_id=sid,
                )
            )

    cycles = g.detect_cycles()
    conflicts = g.unresolved_conflicts()
    sample: list[dict[str, str]] = []
    for rec in records[:50]:
        name = rec.get("scientific_name")
        if isinstance(name, str):
            accepted, path = g.resolve_accepted(name)
            sample.append(
                {
                    "query": name,
                    "resolved": accepted,
                    "path": " -> ".join(path),
                }
            )

    names = set()
    for e in g.edges:
        names.add(_norm(e.from_name))
        names.add(_norm(e.to_name))

    report = SynonymGraphReport(
        edge_count=len(g.edges),
        unique_names=len(names),
        cycles_detected=cycles[:20],
        unresolved_conflicts=conflicts[:50],
        accepted_resolutions_sample=sample,
        integrity_pass=len(cycles) == 0,
        notes=(
            "Old synonym search resolves to canonical accepted name without erasing "
            "historical evidence edges."
        ),
    )
    return g, report
