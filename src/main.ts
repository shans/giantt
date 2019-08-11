import {getCSVData} from "./input-csv";
import {getSheetData} from "./input-sheet";
import {tabsToData} from "./tabs-to-data";
import {improvedLayout} from "./layout-gantt";
import {renderGantt} from "./render-gantt";
import {goodSort} from "./sort-tasks";
import {writeHTML} from "./output-file";
import {rollupGantt} from "./rollup-gantt";
const minimist = require('minimist');

const options = minimist(process.argv.slice(2), {
  output: ['output'],
  inputFile: ['inputFile'],
  inputAuth: ['inputAuth'],
  rollup: ['rollup']
});

if (!options.output || ((options.inputFile ? 0 : 1) + (options.inputAuth ? 0 : 1)) !== 1) {
  console.log('USAGE (local .csv file): node main.js --inputFile=<csv filename> --output=<filename>');
  console.log('USAGE (key file pointing to Google Sheet): node main.js --inputAuth=<key filename> --output=<filename>');
  process.exit(1);
}

async function main() {
  let tabs;
  if (options.inputFile) {
    const data = getCSVData(options.inputFile);
    tabs = tabsToData(data);
  } else {
    const data = await getSheetData(options.inputAuth);
    tabs = tabsToData(data);
  }

  let fullTabs = improvedLayout(tabs);

  if (options.rollup) {
    fullTabs = rollupGantt(fullTabs);
  }

  const depFilteredTabs = goodSort(fullTabs);

  const html = renderGantt(depFilteredTabs);
  writeHTML(options.output, html);
}

main();
