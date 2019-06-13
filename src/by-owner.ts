import {getCSVData} from "./input-csv";
import {tabsToData} from "./tabs-to-data";
import {improvedLayout} from "./layout-gantt";
import {renderGantt} from "./render-gantt";
import {goodSort} from "./sort-tasks";
import {writeHTML} from "./output-file";
import {getSheetData} from "./input-sheet";
const minimist = require('minimist');

const options = minimist(process.argv.slice(2), {
  string: ['owner'],
  dependencies: ['boolean'],
  output: ['output'],
  inputFile: ['inputFile'],
  inputCSV: ['inputCSV']
});

if (!options.owner || !options.output || ((options.inputFile ? 0 : 1) + (options.inputAuth ? 0 : 1)) !== 1) {
  console.log('USAGE (local CSV): node by-owner.js --inputFile=<csv filename> --owner=<username> --dependencies? --output=<filename>');
  console.log('USAGE (key file pointing to Google Sheets): node by-owner.js --inputAuth=<key filename> --owner=<username> --dependencies? --output=<filename>');
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

  const taskOwners: {[index: string]: string[]} = {}
  fullTabs.forEach(task => {
    const ownerList = task.owner.split(',').map(a => a.trim());
    taskOwners[task.id] = ownerList;
  });

  fullTabs = fullTabs.filter(task => {
    if (task.owner.split(',').map(a => a.trim()).includes(options.owner)) {
      return true;
    }
    if (options.dependencies) {
      let ownedDeps = task.allDependencies.filter(dep => taskOwners[dep].includes(options.owner));
      return ownedDeps.length > 0;
    }
  });

  const depFilteredTabs = goodSort(fullTabs);

  const html = renderGantt(depFilteredTabs);
  writeHTML(options.output, html);
}

main();
