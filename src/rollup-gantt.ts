import {SchedulableTask} from "./data-model";

export function rollupGantt(tasks: SchedulableTask[]) {
  const output: SchedulableTask[] = [];
  const rollupMap: {[index: string]: {[index: string]: SchedulableTask[]}} = {};
  for (const task of tasks) {
    if (task.rollup == null) {
      output.push(task);
      continue;
    }
    const users = rollupMap[task.rollup] || {};
    const list = users[task.owner] || [];
    list.push(task);
    users[task.owner] = list;
    rollupMap[task.rollup] = users;
  }

  for (const rollup in rollupMap) {
    for (const owner in rollupMap[rollup]) {
      const tasks = rollupMap[rollup][owner];
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
          completed / duration * 100, priority, null);
      rollupTask.intervals = intervals;
      output.push(rollupTask);
    }
  }
  return output;
}
