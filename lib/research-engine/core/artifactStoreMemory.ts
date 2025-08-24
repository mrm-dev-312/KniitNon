import { ArtifactStore, StageNumber } from './types';
import { ulid } from 'ulid';

interface StoredArtifact {
  id: string;
  stage: StageNumber;
  schemaId: string;
  data: unknown;
  createdAt: string;
}

export class InMemoryArtifactStore implements ArtifactStore {
  private artifacts: StoredArtifact[] = [];

  async getArtifacts(stage: StageNumber): Promise<Record<string, unknown>[]> {
    return this.artifacts.filter(a => a.stage === stage).map(a => a.data as Record<string, unknown>);
  }

  async saveArtifact(stage: StageNumber, schemaId: string, data: unknown): Promise<void> {
    this.artifacts.push({ id: ulid(), stage, schemaId, data, createdAt: new Date().toISOString() });
  }
}

export const createInMemoryArtifactStore = () => new InMemoryArtifactStore();