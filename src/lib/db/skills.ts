"use client";

import { db, type SkillRecord } from "./schema";

export type Skill = SkillRecord;

function newId(): string {
  return `sk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listSkills(): Promise<Skill[]> {
  const all = await db().skills.toArray();
  return all.sort((a, b) => {
    if (a.alwaysOn !== b.alwaysOn) return a.alwaysOn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getSkill(id: string): Promise<Skill | null> {
  return (await db().skills.get(id)) ?? null;
}

export async function createSkill(input: Omit<Skill, "id" | "createdAt" | "updatedAt">): Promise<Skill> {
  const now = Date.now();
  const skill: Skill = {
    id: newId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db().skills.put(skill);
  return skill;
}

export async function updateSkill(id: string, patch: Partial<Omit<Skill, "id" | "createdAt">>): Promise<void> {
  const existing = await db().skills.get(id);
  if (!existing) return;
  await db().skills.put({ ...existing, ...patch, updatedAt: Date.now() });
}

export async function deleteSkill(id: string): Promise<void> {
  await db().skills.delete(id);
}

export async function listEnabledSkills(): Promise<Skill[]> {
  const all = await db().skills.toArray();
  return all.filter((s) => s.enabled || s.alwaysOn).sort((a, b) => {
    if (a.alwaysOn !== b.alwaysOn) return a.alwaysOn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export const TOKEN_PER_CHAR_ESTIMATE = 0.27;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKEN_PER_CHAR_ESTIMATE);
}

export const MAX_ENABLED_SKILLS = 3;
