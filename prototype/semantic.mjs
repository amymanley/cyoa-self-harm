import { pipeline, env } from '@huggingface/transformers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { allowedInContext } from './context.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
env.cacheDir = process.env.MODEL_CACHE || path.join(root, '.cache', 'models');
export const semanticModel = 'Xenova/all-MiniLM-L6-v2';

// This score measures similarity, not the probability that a reply is correct.
export function selectMatch(ranked, minimum = 0.55, margin = 0.08) {
  if (!ranked.length || ranked[0].score < minimum) return null;
  if (ranked[1] && ranked[0].score - ranked[1].score < margin) return null;
  return ranked[0].clip;
}

export async function loadMatcher(clips) {
  const extractor = await pipeline('feature-extraction', semanticModel, { dtype: 'q8' });
  const entries = JSON.parse(await readFile(path.join(root,'data/question-phrases.json'),'utf8')).entries;
  const variants = clips.flatMap(c => [{ id:c.id, text:c.doctor }, ...entries.filter(e=>e.id===c.id).flatMap(e=>e.phrases.map(text=>({id:c.id,text,contexts:e.contexts})))]);
  const vectors = new Map();
  for (let i = 0; i < variants.length; i += 16) {
    const batch = variants.slice(i, i + 16);
    const output = await extractor(batch.map(c => c.text), { pooling: 'mean', normalize: true });
    output.tolist().forEach((v, j) => {
      const item=batch[j];
      if(!vectors.has(item.id)) vectors.set(item.id,[]);
      vectors.get(item.id).push({...item,vector:v});
    });
  }
  // Serial inference keeps simultaneous sessions from competing for CPU memory.
  let queue = Promise.resolve();
  function rank(question, candidates, context) {
    const task = queue.then(async () => {
      const [q] = (await extractor(question, { pooling: 'mean', normalize: true })).tolist();
      const explicitlyEnding = /\b(goodbye|bye|end|finish|finished|stop)\b/i.test(question);
      return candidates.filter(c => (!c.exit || explicitlyEnding) && allowedInContext(c,context,question)).map(clip => ({
        clip, score: Math.max(...vectors.get(clip.id).filter(v=>!v.contexts||v.contexts.includes(context)).map(v=>v.vector.reduce((sum, x, i) => sum + x * q[i], 0)))
      })).sort((a, b) => b.score - a.score);
    });
    queue = task.catch(() => {});
    return task;
  }
  return { rank, match: async (question, candidates, context) => {
    if ((question.match(/\?/g) || []).length > 1 || /\b(?:and|also)\s+(?:what|which|when|where|why|how|who)\b/i.test(question)) return null;
    return selectMatch(await rank(question, candidates, context));
  } };
}
