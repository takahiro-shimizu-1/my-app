/**
 * Evaluator Registry
 *
 * Central registry for all evaluators. Supports:
 * - Registering new evaluators at runtime (plugin system)
 * - Looking up evaluators by requirement type
 * - Iterating over all registered evaluators
 */

import type { RequirementType } from "@/lib/judgesystem/domain/types";
import type { Evaluator } from "./base";
import { IneligibilityEvaluator } from "./ineligibility";
import { LocationEvaluator } from "./location";
import { ExperienceEvaluator } from "./experience";
import { TechnicianEvaluator } from "./technician";
import { GradeEvaluator } from "./grade";

export class EvaluatorRegistry {
  private readonly evaluators = new Map<RequirementType, Evaluator>();

  register(evaluator: Evaluator): void {
    this.evaluators.set(evaluator.type, evaluator);
  }

  get(type: RequirementType): Evaluator | undefined {
    return this.evaluators.get(type);
  }

  has(type: RequirementType): boolean {
    return this.evaluators.has(type);
  }

  getAll(): Evaluator[] {
    return [...this.evaluators.values()];
  }

  getRegisteredTypes(): RequirementType[] {
    return [...this.evaluators.keys()];
  }
}

/** Creates a registry pre-loaded with all built-in evaluators */
export function createDefaultRegistry(): EvaluatorRegistry {
  const registry = new EvaluatorRegistry();
  registry.register(new IneligibilityEvaluator());
  registry.register(new LocationEvaluator());
  registry.register(new ExperienceEvaluator());
  registry.register(new TechnicianEvaluator());
  registry.register(new GradeEvaluator());
  return registry;
}
