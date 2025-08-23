import { NextRequest, NextResponse } from 'next/server';
import { StageEngine } from '@/lib/research-engine/core/StageEngine';
import { simpleGateEvaluator } from '@/lib/research-engine/core/gateEvaluator';
import { StageConfig, ArtifactStore, PromptRunner } from '@/lib/research-engine/core/types';

const ENABLED = process.env.RESEARCH_PIPELINE_V2 === '1';

// Placeholder in-memory artifact store
const memoryArtifacts: Record<number, Record<string, unknown>[]> = {};
const artifactStore: ArtifactStore = {
  async getArtifacts(stage) { return memoryArtifacts[stage] || []; },
  async saveArtifact(stage, schemaId, data) {
    memoryArtifacts[stage] = memoryArtifacts[stage] || [];
    memoryArtifacts[stage].push({ schemaId, data, savedAt: new Date().toISOString() });
  }
};

const promptRunner: PromptRunner = {
  async runPrompt(id, context) {
    // Stub: just return context for now.
    return { id, echo: true };
  }
};

const stageConfigs: StageConfig[] = [
  { stage: 0, name: 'Exploration & Scope', prompts: [], gate: { rules: [] } },
];

const engine = new StageEngine({
  configs: stageConfigs,
  artifactStore,
  promptRunner,
  gateEvaluator: simpleGateEvaluator,
});

export async function POST(req: NextRequest, { params }: { params: { stage: string } }) {
  if (!ENABLED) {
    return NextResponse.json({ error: 'Research pipeline v2 disabled' }, { status: 403 });
  }
  const stageNum = Number(params.stage);
  if (isNaN(stageNum) || stageNum < 0 || stageNum > 5) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const gateResult = await engine.runStage(stageNum as any, body || {});
    return NextResponse.json({ stage: stageNum, gateResult });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { stage: string } }) {
  if (!ENABLED) {
    return NextResponse.json({ error: 'Research pipeline v2 disabled' }, { status: 403 });
  }
  const stageNum = Number(params.stage);
  const cfg = engine.getConfig(stageNum as any);
  if (!cfg) return NextResponse.json({ error: 'Stage config not found' }, { status: 404 });
  return NextResponse.json({ config: cfg });
}
