import {InputTask} from "./data-model";

function tabToData(tab: string[]) {
  return new InputTask(tab[0], tab[1], tab[2], tab[3], tab[4], tab[5], tab[6], tab[7]);
}

export function tabsToData(tabs: string[][]) {
  // Typically the first row contains headings; discard if it doesn't parse.
  try {
    tabToData(tabs[0]);
  } catch (e) {
    tabs = tabs.slice(1);
  }
  const result = tabs.filter(a => a.length !== 0).filter(a => a[0] !== '').map(tabToData);
  const minDate = Math.min(...result.filter(a => a.start !== null).map(a => a.start !== null ? a.start.getTime() : 0));
  result.forEach(a => {
    if (a.start == null && a.dependencies.length == 0) {
      a.defaultStart = new Date(minDate);
    }
  });
  return result;
}
