export type DurationInfo = {
  amount: number;
  unit: 'd' | 'w' | 'm';
}

export interface Task {
  id: string;
  name: string;
  owner: string;
  start: Date | null;
  end: Date | null;
  duration: DurationInfo | null;
  dependencies: string[];
  percent: number;
  priority: number;
}

export class InputTask implements Task {
  start: Date | null;
  end: Date | null;
  duration: DurationInfo | null;
  dependencies: string[];
  percent: number;
  defaultStart: Date | null = null;
  priority: number = Number.MAX_SAFE_INTEGER;
  constructor(public id: string, public name: string, public owner: string, start: string, end: string, duration: string, dependencies: string, percent: string, priority: string) {
    this.start = start === '' ? null : new Date(start);
    this.end = end === '' ? null : new Date(end);
    if (this.start && this.start.toString() === 'Invalid Date') {
       throw new TypeError(`Invalid Date ${start} provided to InputTask constructor`);
    }
    if (this.end && this.end.toString() === 'Invalid Date') {
      throw new TypeError(`Invalid Date ${end} provided to InputTask constructor`);
    }
    const l = duration.length - 1;
    const unit = duration[l];
    if (unit !== 'd' && unit !== 'w' && unit !== 'm') {
      this.duration = null;
    }
    else {
      this.duration = {amount: Number(duration.substring(0, l)), unit};
    }
    this.dependencies = dependencies ? dependencies.split(',').map(a => a.trim()).filter(a => a !== '') : [];
    this.percent = percent ? Number(percent.substring(0, percent.length - 1)) : 0;
    const priorityAsNumber: number = Number(priority);
    if (Number.isSafeInteger(priorityAsNumber)) {
      this.priority = priorityAsNumber;
    }
  }
  makeSchedulable(): SchedulableTask {
    return new SchedulableTask(this.id, this.name, this.owner, this.start, 
          this.end, this.duration, this.dependencies, this.percent, this.priority);
  }
}

export class SchedulableTask implements Task {
  reverseDependencies: string[] = [];
  allDependencies: string[] = [];
  allReverseDependencies: string[] = [];
  rank: number = -1;
  weakDependencies: string[] = [];
  intervals: [Date, Date][] = [];
  constructor(public id: string, public name: string, public owner: string, public start: Date | null, 
    public end: Date | null, public duration: DurationInfo | null, public dependencies: string[], public percent: number, public priority: number) {
  }

  computeEndDate(clearEnd: boolean = false) {
    if (!clearEnd && this.end !== null) {
      return;
    }
    if (this.duration == null) {
      return;
    }
    if (this.start !== null) {
      let modifier = 1000 * 60 * 60 * 24; // 1 day
      if (this.duration.unit == 'd') {
        this.duration.unit = 'w';
        this.duration.amount /= 5;
      }
      if (this.duration.unit === 'w') {
        modifier *= 7;
      }
      else if (this.duration.unit === 'm') {
        modifier *= 30;
      }
      this.end = new Date(this.start.getTime() + this.duration.amount * modifier);
    }
  }

  static modifier = 1000 * 60 * 60 * 24 * 7; // 1 week

  durationAsMilliseconds() {
    if (this.duration) {
      let weeksLeft = this.duration.amount;
      if (this.duration.unit == 'd') {
          weeksLeft /= 5;
      }
      if (this.duration.unit == 'm') {
          weeksLeft *= 4;
      }
      return weeksLeft * SchedulableTask.modifier;
    } else {
      throw new Error(`Can't compute duration with no duration field`);
    }
  }

  static completeDependencyInformation(tasks: SchedulableTask[]) {
    const taskMap: {[index: string]: SchedulableTask} = {};

    for (const task of tasks) {
      taskMap[task.id] = task;
    }
  
    function findAllDependencies(id: string, dependency: string) {
      taskMap[id].allDependencies.push(dependency);
      if (!taskMap[dependency]) {
        throw new Error(`${dependency}: invalid dependency ID!`);
      }
      for (const subDependency of taskMap[dependency].dependencies) {
        findAllDependencies(id, subDependency);
      }
    }

    function findAllReverseDependencies(id: string, reverseDependency: string) {
      taskMap[id].allReverseDependencies.push(reverseDependency);
      if (!taskMap[reverseDependency]) {
        throw new Error(`${reverseDependency}: invalid dependency ID!`);
      }
      for (const subDependency of taskMap[reverseDependency].reverseDependencies) {
        findAllReverseDependencies(id, subDependency);
      }
    }

    for (const id of Object.keys(taskMap)) {
      for (const dependency of taskMap[id].dependencies) {
        if (!taskMap[dependency]) {
          throw new Error(`${dependency}: invalid dependency ID!`);
        }  
        taskMap[dependency].reverseDependencies.push(id);
        findAllDependencies(id, dependency);
      }
    }
    for (const id of Object.keys(taskMap)) {
      for (const reverseDependency of taskMap[id].reverseDependencies) {
        findAllReverseDependencies(id, reverseDependency);
      }
    }

    const prevTasks: {[index: string]: string} = {};

    tasks.forEach(task => {
      if (task.owner == '') {
        return;
      }
      const prev = prevTasks[task.owner];
      prevTasks[task.owner] = task.id;

      if (!prev) {
        return;
      }

      if (task.allDependencies.includes(prev)) {
        return;
      }

      task.weakDependencies.push(prev);
      /*
      task.allDependencies.push(prev);
      taskMap[prev].reverseDependencies.push(task.id);
      taskMap[prev].allReverseDependencies.push(task.id);
      */
    });
  }
}
