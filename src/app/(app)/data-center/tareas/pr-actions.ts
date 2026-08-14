"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { githubFetch } from "@/lib/github";

export async function createPullRequestForTask(taskId: string): Promise<string> {
  const user = await requireUser();

  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      prUrl: tasks.prUrl,
      repo: projects.githubRepo,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .limit(1);

  if (!row) throw new Error("Tarea no encontrada.");
  if (row.prUrl) return row.prUrl;
  if (!row.repo) {
    throw new Error(
      "Esta tarea no tiene un proyecto con repo de GitHub configurado.",
    );
  }

  const [owner, repo] = row.repo.split("/");
  if (!owner || !repo) {
    throw new Error('El repo del proyecto debe tener el formato "owner/repo".');
  }

  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`);
  const baseBranch = repoInfo.default_branch as string;

  const refInfo = await githubFetch(
    `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
  );
  const baseSha = refInfo.object.sha as string;

  const shortId = row.id.slice(0, 8);
  const branchName = `life-os/${shortId}`;

  await githubFetch(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
  });

  const briefPath = `life-os-tasks/${shortId}.md`;
  const briefContent = [
    `# ${row.title}`,
    "",
    row.description || "_(sin descripción)_",
    "",
    "---",
    "_Brief creado desde Life OS — reemplazá este archivo por tus cambios reales._",
    "",
  ].join("\n");

  await githubFetch(`/repos/${owner}/${repo}/contents/${briefPath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Life OS: brief de "${row.title}"`,
      content: Buffer.from(briefContent, "utf-8").toString("base64"),
      branch: branchName,
    }),
  });

  const pr = await githubFetch(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: row.title,
      head: branchName,
      base: baseBranch,
      body: row.description || "Generado desde Life OS.",
      draft: true,
    }),
  });

  const prUrl = pr.html_url as string;

  await db
    .update(tasks)
    .set({ prUrl, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  return prUrl;
}
