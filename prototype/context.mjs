import { readFile } from 'node:fs/promises';
export const contextRules=JSON.parse(await readFile(new URL('./data/context-rules.json',import.meta.url),'utf8'));
export const normalizeQuestion=s=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function allowedInContext(clip,current,question='') {
  const previous=contextRules.requiredPrevious[clip.id];
  if(previous && !previous.includes(current))return false;
  return !(contextRules.incompatibleQuestionPatterns[clip.id]||[]).some(pattern=>new RegExp(pattern,'i').test(question));
}

export function promptKind(question) {
  const q=normalizeQuestion(question);
  if(/^(?:h+m+|m+h+m*|m+|nod|h+m+ nod|go on|please go on|go on please|carry on|please carry on|continue|please continue|im listening|tell me more|tell me a little more|tell me a bit more|can you tell me more|could you tell me more|please tell me more|please say more)$/.test(q))return 'continue';
  if(/^(?:what do you mean|what do you mean by that|can you explain|could you explain|can you explain that|could you explain that|tell me more about that|can you tell me more about that|could you tell me more about that|can you tell me about that|what was that like|how was that|alright)$/.test(q))return 'clarify';
  if(/^(?:how much|how many|how much did you take|how many did you take|how many tablets|how many tablets did you take|what quantity)$/.test(q))return 'amount';
  if(/^(?:what dose|what strength|what dose were they|what dose are they|what strength were they|what strength are they|what was the dose|what was the strength|how many milligrams)$/.test(q))return 'strength';
  if(/^(?:which ones|which tablets|which medicine|which medication)$/.test(q))return 'which';
  if(/^(?:of each|of each one|six of each|6 of each|the same number of each)$/.test(q))return 'each';
  if(/^(?:when|when was that|when did that happen|what time|what time specifically|what time was that|how long ago)$/.test(q))return 'when';
  if(/^(?:how has that affected you|how did that affect you|what impact has that had|how has it affected you|what has that meant for you)$/.test(q))return 'impact';
  if(/^(?:how old were you|how old were you then|how old were you when that happened|how old was she|what age was she|what age were you)$/.test(q))return 'age';
  if(/^(?:what did you do after that|what happened next|what did you do next)$/.test(q))return 'next';
  // Brief pronoun-only prompts have no reliable referent unless explicitly routed.
  if(/^(?:why|why was that|why did you do that|where|where was that|who|who was that|how|how so|and then|okay|ok|right|yes|yeah)$/.test(q))return 'unspecified';
  return null;
}

export function resolveShortPrompt(question,current,candidates) {
  const kind=promptKind(question);
  if(!kind)return {handled:false,clip:null};
  const id=contextRules.routes[kind]?.[current];
  const clip=candidates.find(c=>c.id===id && allowedInContext(c,current,question))||null;
  return {handled:true,clip,kind};
}
