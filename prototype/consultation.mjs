// Preserve the original shift_option order, without mutating the scenario data.
export function suggestedClips(current, clips, excludes) {
  if (current.end) return [];
  const lists = current.options.map(ids => ids.filter(id => clips.has(id) && !excludes.has(id)));
  const selected = [], used = new Set();
  for (const order of [[0,2,1],[1,0,2],[2,0,1]]) {
    for (const i of order) {
      while (lists[i].length && used.has(lists[i][0])) lists[i].shift();
      if (!lists[i].length) continue;
      const id = lists[i].shift();
      used.add(id);
      selected.push(clips.get(id));
      break;
    }
  }
  return selected;
}

// Any fully completed combination covers the area: AND within, OR between lists.
export const covers = (area, choices) => area.sets.some(set => set.every(id => choices.includes(id)));
