import {getData} from "./input-csv";
import {tabsToData} from "./tabs-to-data";
import {layoutGantt} from "./layout-gantt";
import {renderGantt} from "./render-gantt";
import {ownerThenStart, dependencyFilter, goodSort} from "./sort-tasks";
import {writeHTML} from "./output-file";
const minimist = require('minimist');

const options = minimist(process.argv.slice(2), {
  string: ['owner'],
  dependencies: ['boolean'],
  output: ['output']
});

if (!options.owner || !options.output) {
  console.log('USAGE: node by-owner.js --owner=<username> --dependencies? --output=<filename>');
  process.exit(1);
}

const data = getData('input.csv');
const tabs = tabsToData(data);

let fullTabs = layoutGantt(tabs);

const taskOwners: {[index: string]: string} = {}
fullTabs.forEach(task => taskOwners[task.id] = task.owner);

fullTabs = fullTabs.filter(task => {
  if (task.owner == options.owner) {
    return true;
  }
  if (options.dependencies) {
    let ownedDeps = task.allDependencies.filter(dep => taskOwners[dep] == options.owner);
    return ownedDeps.length > 0;
  }
});

const depFilteredTabs = goodSort(fullTabs);

const html = renderGantt(depFilteredTabs);
writeHTML(options.output, html);
