import {SchedulableTask} from "./data-model";

const WEEK_WIDTH = 40;
const TASK_HEIGHT = 30;
const TASK_PADDING = 6;

const colors: {[index: string]: string} = {
  piotrs: '#F44336',
  shanestephens: '#E91E63',
  mykmartin: '#9C27B0',
  rvera: '#673AB7',
  csilvestrini: '#3F51B5',
  mmandlis: '#2196F3',
  wkorman: '#009688',
  jopra: '#4CAF50',
  cromwellian: '#FFC107',
  yuangu: '#FF9800',
  plindner: '#FF5722',
  alxrsngrtn: '#795548',
  '': '#607D8B'
}

class TaskRenderData {
  upConnectionOffsets: {[index: string]: number} = {};
  downConnectionOffsets: {[index: string]: number} = {};
  constructor(public left: number, public top: number, public width: number, public height: number) {}
}

export function renderGantt(tasks: SchedulableTask[]) {
  const minStart = Math.min(...tasks.map(a => {
    if (a.start == null)
      return Number.MAX_SAFE_INTEGER;
    return a.start.getTime();
  }));

  const maxEnd = Math.max(...tasks.map(a => {
    if (a.end == null)
      return 0;
    return a.end.getTime();
  }));

  const one_week = 1000 * 60 * 60 * 24 * 7;
  const width = (maxEnd - minStart) / one_week * WEEK_WIDTH + 20;

  let output = `
<html>
  <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
  <style>
  .box {
    display: grid;
    grid-template-columns: max-content ${width}px;
    grid-auto-rows: ${TASK_HEIGHT + TASK_PADDING}px;
  }
  .box > div:nth-child(4n+0), .box > div:nth-child(4n+3) {
    background-color: #EEE;
    border-bottom: 1px solid #DDD;
    border-top: 1px solid #DDD;
  }
  .label {
    grid-column: 1;
    text-align: right;
    font-size: 18px;
    font-family: 'Roboto', sans-serif;
    line-height: ${TASK_HEIGHT + TASK_PADDING}px;
  }
  .task {
    height: ${TASK_HEIGHT}px;
    position: relative;
    border-radius: 5px;
    grid-column: 3;
    z-index: 2;
    box-sizing: border-box;
    color: black;
  }
  .task.selected {
    border: 2px solid black;
  }

  .task .message {
    text-overflow: hidden;
    overflow: hidden;
    width: 100%;
    height: ${TASK_HEIGHT}px;
    padding-left: 5px;
    position: relative;
    top: -${TASK_HEIGHT - 1}px;
    font-size: 14px;
    font-family: 'Roboto', sans-serif;
    line-height: ${TASK_HEIGHT - 2}px;
  }

  .task-complete {
    background-color: rgba(0, 0, 0, 30%);
    height: 100%;
    border-radius: 5px;
    box-sizing: border-box;
  }

  .background {
    width: ${width}px;
    height: 100%;
  }
  #arrow-container {
    position: relative;
    top: -${(TASK_HEIGHT + TASK_PADDING) * tasks.length}px;
    background: transparent;
    border: 0px;
  }
  .down-arrow {
    position: relative;
    left: 20px;
    border-left: 1px solid black;
    border-bottom: 1px solid black;
    border-bottom-left-radius: 30px;
    background: transparent;
    box-sizing: border-box;
  }
  .up-arrow {
    position: relative;
    left: 20px;
    border-left: 1px solid black;
    border-top: 1px solid black;
    border-top-left-radius: 30px;
    background: transparent;
    box-sizing: border-box;
  }

  .down-arrow.selected, .up-arrow.selected {
    border-width: 3px;
  }

  .date {
    height: ${(TASK_HEIGHT + TASK_PADDING) * (tasks.length + 1)}px;
    display: inline-block;
    border-left: solid 1px #DDD;
    padding-left: 5px;
    box-sizing: border-box;
    font-size: 18px;
    font-family: 'Roboto', sans-serif;
    position: relative;
    line-height: ${(TASK_HEIGHT + TASK_PADDING) * 2 * (tasks.length + 1) - (TASK_HEIGHT + TASK_PADDING) / 2}px;
    top: -${(TASK_HEIGHT + TASK_PADDING) * (tasks.length + 1) + 2 * TASK_PADDING}px;
    z-index: 1;
  }

  .today {
    height: ${(TASK_HEIGHT + TASK_PADDING) * (tasks.length + 1)}px;
    width: 3px;
    display: inline-block;
    background: red;
    box-sizing: border-box;
    position: relative;
    top: -${(TASK_HEIGHT + TASK_PADDING) * (tasks.length + 1) + 2 * TASK_PADDING}px;
    z-index: 3;    
  }
  </style>
  <div class='box'>
  `;
  
  const task_positions : {[index: string]: TaskRenderData} = {};
  let top = TASK_PADDING / 2;
  let offset = 0;
  for (let task of tasks) {
    if (task.start == null || task.end == null) {
      offset += TASK_HEIGHT + TASK_PADDING;;
      continue;
    }
    const width = (task.end.getTime() - task.start.getTime()) / one_week * WEEK_WIDTH;
    const left = (task.start.getTime() - minStart) / one_week * WEEK_WIDTH + 20;
    task_positions[task.id] = new TaskRenderData(left, top + offset, width, TASK_HEIGHT);
    
    let seenTask = false;
    let depOffset = 0;
    for (let potentialRDep of tasks) {
      if (potentialRDep === task) {
        seenTask = true;
        depOffset = 0;
        continue;
      }
      if (task.reverseDependencies.includes(potentialRDep.id)) {
        if (seenTask) {
          task_positions[task.id].downConnectionOffsets[potentialRDep.id] = depOffset;
        } else {
          task_positions[task.id].upConnectionOffsets[potentialRDep.id] = depOffset;
        }
        depOffset -= 0;
      }
    }

    output += `<div class=label style='color: ${colors[task.owner]};'>${task.name}</div>`
    output += `
    <div class=background>
    <div class=task id='${task.id}' style='width: ${width}px; top: ${top}px; left: ${left}px; background: ${colors[task.owner]}'>
    <div class='task-complete' style='width: ${task.percent}%'></div><div class='message'></div>
    </div>
    </div>`;
    offset += TASK_HEIGHT + TASK_PADDING;
  }

  output += `<div style='background: transparent; border: none'></div><div id='arrow-container'>`

  top = -TASK_PADDING / 2;
  let accumulated_height = 0;
  let next_arrow_id = 0;
  let arrows_for_task: {[index: string]: Set<string>} = {};
  for (let task of tasks) {
    const dependencies = task.dependencies.slice();
    dependencies.sort((a: string, b: string) => {
      const aInd = tasks.findIndex(task => task.id === a);
      const bInd = tasks.findIndex(task => task.id === b);
      if (aInd > bInd) {
        return -1;
      }
      if (aInd < bInd) {
        return 1;
      }
      return 0;
    });
    for (let dependency of dependencies) {
      if (!task_positions[dependency]) {
        continue;
      }
      let dir = 'down';
      let left = task_positions[dependency].left + task_positions[dependency].width / 2;
      let width = task_positions[task.id].left - left;
      let height = task_positions[task.id].top - task_positions[dependency].top - TASK_HEIGHT / 2;
      let top_adj = top - accumulated_height;
      if (height < 0) {
        height = -height;
        dir = 'up';
        top_adj += TASK_PADDING + TASK_HEIGHT / 2;
        height -= TASK_HEIGHT;
        left += task_positions[dependency].upConnectionOffsets[task.id];
        width -= task_positions[dependency].upConnectionOffsets[task.id];
      } else {
        top_adj -= height - TASK_HEIGHT / 2 - TASK_PADDING;
        left += task_positions[dependency].downConnectionOffsets[task.id];
        width -= task_positions[dependency].downConnectionOffsets[task.id];
      }
      for (let check_task of tasks) {
        if (!arrows_for_task[check_task.id]) {
          arrows_for_task[check_task.id] = new Set();
        }
        if (check_task.allDependencies.includes(task.id)) {
          arrows_for_task[check_task.id].add('a' + next_arrow_id);
        }
        if (check_task.allReverseDependencies.includes(dependency)) {
          arrows_for_task[check_task.id].add('a' + next_arrow_id);
        }
      }
      arrows_for_task[dependency].add('a' + next_arrow_id);
      arrows_for_task[task.id].add('a' + next_arrow_id);
      output += `
      <div id='a${next_arrow_id++}' class='${dir}-arrow' style='top: ${top_adj}px; left: ${left}px; width: ${width}px; height: ${height}px;'></div>`
      accumulated_height += height; 
    }
    top += TASK_HEIGHT + TASK_PADDING;
  }
  output += '</div>'

  const strings = tasks.map(task => `{
    id: '${task.id}', name: '${task.name}', owner: '${task.owner}',
    descendants: [${task.allReverseDependencies.map(a => `'${a}'`).join(', ')}],
    ancestors: [${task.allDependencies.map(a => `'${a}'`).join(', ')}],
    duration: '${task.duration ? task.duration.amount + task.duration.unit : '0w'}',
    arrows: [${[...arrows_for_task[task.id]].map(a => `'${a}'`).join(', ')}]
  }`);

  output += `<script>
  let tasks = [${strings.join(', ')}];
  </script>`
  output += `<div style='background: transparent; border: none'></div><div style='background: transparent; border: none'><div style='width: 20px; height: ${TASK_HEIGHT}px; display: inline-block'></div>`
  
  let date = new Date(minStart);
  let month = date.getMonth();
  if (month == 12) {
    date.setMonth(1);
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(month + 1);
  }
  date.setDate(1);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  let last = minStart;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  while (date.getTime() < maxEnd) {
    let diff = date.getTime() - last;
    let pxWidth = diff / one_week * WEEK_WIDTH;
    output += `<div class='date' style='width: ${pxWidth}px'>${months[date.getMonth() - 1]}</div>`;
    last = date.getTime();
    let month = date.getMonth();
    if (month == 12) {
      date.setMonth(1);
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(month + 1);
    }
  }
  let pxWidth = (maxEnd - last) / one_week * WEEK_WIDTH;
  output += `<div class='date' style='width: ${pxWidth - 3}px'>${months[date.getMonth() - 1]}</div>`;  
  let todayPos = (new Date().getTime() - maxEnd) / one_week * WEEK_WIDTH;
  output += `<div class=today style='left: ${todayPos + 3}px'></div>`;
  output += `
  </div></div>
  <script src="src/gantt-script.js"></script>
  </html>
  `;
  return output;
}
