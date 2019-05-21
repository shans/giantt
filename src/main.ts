import {getData} from "./input-csv";
import {tabsToData} from "./tabs-to-data";
import {layoutGantt} from "./layout-gantt";
import {renderGantt} from "./render-gantt";
import {goodSort} from "./sort-tasks";
import {writeHTML} from "./output-file";
const minimist = require('minimist');

const options = minimist(process.argv.slice(2), {
  output: ['output']
});

if (!options.output) {
  console.log('USAGE: node main.js --output=<filename>');
  process.exit(1);
}

const data = getData('input.csv');
const tabs = tabsToData(data);

const fullTabs = layoutGantt(tabs);

const depFilteredTabs = goodSort(fullTabs);

const html = renderGantt(depFilteredTabs);
writeHTML(options.output, html);
