import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { StageConfig, StageNumber } from './types';

/**
 * StageRegistry loads StageConfig definitions from YAML files located in lib/research-engine/stages.
 * It caches parsed configs by stage name. File naming convention: <stageName>.yml or .yaml
 */
export class StageRegistry {
  private cache: Map<string, StageConfig> = new Map();
  private stagesDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'lib', 'research-engine', 'stages')) {
    this.stagesDir = baseDir;
  }

  listStageNames(): string[] {
    if (!fs.existsSync(this.stagesDir)) return [];
    return fs.readdirSync(this.stagesDir)
      .filter(f => f.match(/\.(ya?ml)$/))
      .map(f => f.replace(/\.(ya?ml)$/,'').trim());
  }

  get(stageName: string): StageConfig {
    if (this.cache.has(stageName)) return this.cache.get(stageName)!;
    const filePathYaml = path.join(this.stagesDir, `${stageName}.yaml`);
    const filePathYml = path.join(this.stagesDir, `${stageName}.yml`);
    const filePath = fs.existsSync(filePathYaml) ? filePathYaml : filePathYml;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Stage config file not found for stage '${stageName}' at ${filePathYaml} or ${filePathYml}`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed: any = yaml.load(raw);
    // Basic shape validation (lightweight); deeper validation can be added via Zod/Ajv if needed
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Stage config '${stageName}' is not a YAML object`);
    }
    if (typeof parsed.stage !== 'number') {
      throw new Error(`Stage config '${stageName}' missing required numeric 'stage'`);
    }
    if (!parsed.name || typeof parsed.name !== 'string') {
      parsed.name = stageName;
    }
    if (!Array.isArray(parsed.prompts)) {
      parsed.prompts = [];
    }
    if (!parsed.gate) {
      parsed.gate = { rules: [] };
    }
    const config: StageConfig = {
      stage: parsed.stage as StageNumber,
      name: parsed.name,
      description: parsed.description || undefined,
      prompts: parsed.prompts,
      gate: parsed.gate,
      exports: parsed.exports || undefined,
      metrics: parsed.metrics || undefined,
    };
    this.cache.set(stageName, config);
    return config;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const defaultStageRegistry = new StageRegistry();
