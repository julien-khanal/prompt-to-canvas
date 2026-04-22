"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createSkill,
  deleteSkill,
  listSkills,
  updateSkill,
  type Skill,
} from "@/lib/db/skills";

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listSkills();
    setSkills(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: Parameters<typeof createSkill>[0]) => {
      const sk = await createSkill(input);
      await refresh();
      return sk;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, patch: Parameters<typeof updateSkill>[1]) => {
      await updateSkill(id, patch);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSkill(id);
      await refresh();
    },
    [refresh]
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      await updateSkill(id, { enabled });
      await refresh();
    },
    [refresh]
  );

  return { skills, loading, refresh, create, update, remove, toggle };
}
