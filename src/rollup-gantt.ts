import {SchedulableTask} from "./data-model";

type RollupData = {tasks: SchedulableTask[], userMap: {[index: string]: SchedulableTask[]}};

export function archiveTasks(tasks: SchedulableTask[], date: Date, append: boolean) {
  for (const task of tasks) {
    if (task.end && task.end.getTime() < date.getTime() && task.percent === 100) {
      if (append) {
        task.rollup.push('{{archived}}');
      } else {
        task.rollup = ['{{archived}}'];
      }
    }
  }
}

export function rollupGantt(tasks: SchedulableTask[]) {
  const output: SchedulableTask[] = [];


  // rollupMap maps rollup names to users to tasks.
  const rollupMap: {[index: string]: RollupData} = {};

  
  for (const task of tasks) {
    if (task.rollup.length == 0) {
      output.push(task);
      continue;
    }
    for (const rollup of task.rollup) {
      const data = rollupMap[rollup] || {tasks: [], userMap: {}};
      const list = data.userMap[task.owner] || [];
      data.tasks.push(task);
      list.push(task);
      data.userMap[task.owner] = list;
      rollupMap[rollup] = data;
    }
  }


  const idSets: {rollup: string, ids: Set<string>, isSubset: boolean}[] = [];
  for (const rollup in rollupMap) {
    idSets.push({rollup, ids: new Set(rollupMap[rollup].tasks.map(a => a.id)), isSubset: false});
  }

  for (let i = 0; i < idSets.length; i++) {
    for (let j = 0; j < idSets.length; j++) {
      if (i == j) {
        continue;
      }

      const iSet = idSets[i].ids;
      const jSet = idSets[j].ids;
      let isSubset = true;
      for (const value of iSet.values()) {
        if (!jSet.has(value)) {
          isSubset = false;
          break;
        }
      }
      if (isSubset) {
        idSets[i].isSubset = true;
        break;
      }
    }
  }

  const nonSubsets = idSets.filter(set => set.isSubset == false).map(a => a.rollup);

  for (const rollup of nonSubsets) {
    for (const owner in rollupMap[rollup].userMap) {
      const tasks = rollupMap[rollup].userMap[owner];
      const startDates = tasks.map(task => task.start) as Date[];
      const start = new Date(Math.min(...startDates.map(a => a.getTime())));
      const endDates = tasks.map(task => task.end) as Date[];
      const end = new Date(Math.max(...endDates.map(a => a.getTime())));
      const duration = tasks.map(task => task.durationInWeeks()).reduce((a, b) => a + b, 0);
      const intervals = tasks.map(task => task.intervals).reduce((a, b) => a.concat(b), []);
      const ids = tasks.map(task => task.id);
      let dependencies = tasks.map(task => task.dependencies).reduce((a, b) => a.concat(b), []);
      dependencies = dependencies.filter(dep => !ids.includes(dep));
      const completed = tasks.map(task => task.percent * task.durationInWeeks() / 100).reduce((a, b) => a + b, 0);
      const priority = Math.min(...tasks.map(task => task.priority));
      const rollupTask = new SchedulableTask(rollup, rollup, owner, start, end, {amount: duration, unit: 'w'}, dependencies, 
          completed / duration * 100, priority, []);
      rollupTask.intervals = intervals;
      output.push(rollupTask);
    }
  }
  return output;
}
