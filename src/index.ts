import {tabsToData} from "./tabs-to-data";
import {improvedLayout} from "./layout-gantt";
import {renderGantt} from "./render-gantt";
import {goodSort} from "./sort-tasks";

/** Renders and returns the chart HTML as a string. */
export function renderHTML(data: string[][]) {
  let tabs = tabsToData(data);
  const fullTabs = improvedLayout(tabs);
  const depFilteredTabs = goodSort(fullTabs);
  return renderGantt(depFilteredTabs);
}
