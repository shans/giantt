import {SchedulableTask, InputTask} from "./data-model";
import {chain, ownerSort, prioritySort} from "./sort-tasks";

type PartitionResult<A> = {trueFor: A[], falseFor: A[]}

function partition<A>(list: A[], predicate: ((input: A) => boolean)): PartitionResult<A> {
  const result: PartitionResult<A> = {trueFor: [], falseFor: []};
  for (const value of list) {
    if (predicate(value)) {
      result.trueFor.push(value);
    } else {
      result.falseFor.push(value);
    } 
  }
  return result;
}

type TimeRange = {start: Date, end: Date, task: SchedulableTask}
type ScheduleResult = {result: true, context: null} | {result: false, context: TimeRange};

class TimeMap {
  intervals: TimeRange[] = [];
  check(start: Date, end: Date): ScheduleResult {
    for (const interval of this.intervals) {
      if (interval.start >= end) {
        return {result: true, context: null};
      }
      if (interval.end <= start) {
        continue;
      }
      return {result: false, context: interval};
    }
    return {result: true, context: null};
  }
  scheduleFixed(task: SchedulableTask): ScheduleResult {
    if (task.start == null || task.end == null) {
      throw new Error(`can't schedule fixed timeslot for task ${task.id} with missing start or end time`);
    }

    task.intervals.push([task.start, task.end])
    let position = 0;
    const checkResult = this.check(task.start, task.end);
    if (!checkResult.result) {
      return checkResult;
    }
    for (const interval of this.intervals) {
      if (interval.start <= task.start) {
        position++;
        continue;
      } 
      this.intervals.splice(position, 0, {start: task.start, end: task.end, task});
      return {result: true, context: null};
    }
    this.intervals.push({start: task.start, end: task.end, task});
    return {result: true, context: null};
  }
  scheduleFloating(task: SchedulableTask): ScheduleResult {
    if (task.start == null) {
      if (this.intervals.length === 0) {
        throw new Error(`Can't schedule floating timeslot for task ${task.id} with missing start date`);
      } else {
        task.start = this.intervals[0].start;
      }
    }
    if (task.duration == null) {
      throw new Error(`Can't schedule floating timeslot for task ${task.id} with missing duration`);
    }
    let durationLeft = task.durationAsMilliseconds();
    let adjustedStart = null;
    let effectiveEnd = null;
    for (let i = 0; i < this.intervals.length; i++) {
      if (this.intervals[i].start > task.start) {
        let effectiveStart = task.start;
        if (i > 0 && this.intervals[i - 1].end > effectiveStart) {
          effectiveStart = this.intervals[i - 1].end;
        }
        effectiveEnd = new Date(effectiveStart.getTime() + durationLeft);
        if (this.intervals[i].start < effectiveEnd) {
          effectiveEnd = this.intervals[i].start;
        }
        if (effectiveEnd.getTime() == effectiveStart.getTime()) {
          continue;
        }
        if (adjustedStart == null) {
          adjustedStart = effectiveStart;
        }
        durationLeft -= (effectiveEnd.getTime() - effectiveStart.getTime());
        this.intervals.splice(i, 0, {start: effectiveStart, end: effectiveEnd, task});
        task.intervals.push([effectiveStart, effectiveEnd]);
        i += 1;
        if (durationLeft == 0) {
          break;
        }
      }
    }
    if (durationLeft > 0) {
      let effectiveStart = adjustedStart || task.start;
      if (this.intervals.length > 0) {
        if (this.intervals[this.intervals.length - 1].end > effectiveStart) {
          effectiveStart = this.intervals[this.intervals.length - 1].end;
        }
      }
      if (adjustedStart == null) {
        adjustedStart = effectiveStart;
      }
      effectiveEnd = new Date(effectiveStart.getTime() + durationLeft);        
      this.intervals.push({start: effectiveStart, end: effectiveEnd, task});
      task.intervals.push([effectiveStart, effectiveEnd]);
    }
    task.start = adjustedStart;
    task.end = effectiveEnd;
    return {result: true, context: null};
  }
}

type Dictionary<T> = {[index: string]: T}

class UserTimeMap {
  timeMaps: Dictionary<TimeMap> = {};
  scheduleFixed(task: SchedulableTask): ScheduleResult {
    const owners = task.owner.split(',').map(a => a.trim());
    for (const owner of owners) {
      if (!this.timeMaps[owner]) {
        this.timeMaps[owner] = new TimeMap();
      }
      let result = this.timeMaps[owner].scheduleFixed(task);
      if (result.result == false) {
        return result;
      }
    }
    return {result: true, context: null};
  }
  scheduleFloating(task: SchedulableTask) {
    if (task.owner === '') {
      if (task.start == null) {
        task.start = new Date();
      }
      task.end = new Date(task.start.getTime() + task.durationAsMilliseconds());
      task.intervals.push([task.start, task.end]);
      return {result: true, context: null};
    }
    if (!this.timeMaps[task.owner]) {
      this.timeMaps[task.owner] = new TimeMap();
    }
    return this.timeMaps[task.owner].scheduleFloating(task);
  }
}

export function improvedLayout(tasks: InputTask[]): SchedulableTask[] {
  const userTimeMap = new UserTimeMap();

  // Make tasks schedulable;
  const schedulableTasks = tasks.map(task => task.makeSchedulable());

  const delta = 1 / schedulableTasks.length;
  let currentPriority = 0;
  for (const task of schedulableTasks) {
    if (task.priority == -1) {
      currentPriority += delta;
      task.priority = currentPriority; 
    } else {
      currentPriority = task.priority;
    }
  }

  schedulableTasks.sort(chain([ownerSort, prioritySort]));

  SchedulableTask.completeDependencyInformation(schedulableTasks);

  // Schedule tasks with a defined start and end point
  let {trueFor: definedTasks, falseFor: remainingTasks} 
    = partition(schedulableTasks, task => task.start !== null && task.end !== null);

  const dependents: Dictionary<Date> = {};

  for (const definedTask of definedTasks) {
    if (definedTask.dependencies.length > 0) {
      throw new Error(`can't schedule fixed task ${definedTask.id} because it has fixed start and end date as well as dependencies`);
    }
    let scheduleResult = userTimeMap.scheduleFixed(definedTask);
    if (!scheduleResult.result) {
      throw new Error(`can't schedule fixed task ${definedTask.id} because it overlaps with fixed task ${scheduleResult.context.task.id}`);
    }
    if (definedTask.end !== null) {
      dependents[definedTask.id] = definedTask.end;
    } else {
      throw new Error('wat');
    }
  }

  while (remainingTasks.length > 0) {
    const seenUsers = new Set<string>();
    const {trueFor: noDeps, falseFor: deps} = partition(remainingTasks, task => {
      if (seenUsers.has(task.owner)) {
        return false;
      }
      seenUsers.add(task.owner);
      return task.dependencies.filter(dep => dependents[dep] == undefined).length === 0;
    });
    remainingTasks = deps;
    if (noDeps.length == 0) {
      throw new Error(`circular dependency in tasks ${deps.map(task => task.id)}`);
    }
    for (const readyTask of noDeps) {
      const depDates = readyTask.dependencies.map(dep => dependents[dep]);
      if (readyTask.start !== null) {
        depDates.push(readyTask.start);
      }
      if (depDates.length > 0) {
        readyTask.start = new Date(Math.max(...depDates.map(a => a.getTime())));
      }
      let scheduleResult = userTimeMap.scheduleFloating(readyTask);
      if (readyTask.end !== null) {
        dependents[readyTask.id] = readyTask.end;
      }
    }
  }

  return schedulableTasks;
}

export function layoutGantt(tasks : InputTask[]): SchedulableTask[] {
  const taskMap: {[index: string] : SchedulableTask} = {};
  
  const schedulableTasks = tasks.map(task => task.makeSchedulable());

  for (const task of schedulableTasks) {
    taskMap[task.id] = task;
  }
  
  // compute inverse dependencies, etc.
  SchedulableTask.completeDependencyInformation(schedulableTasks);

  for (const task of schedulableTasks) {
    taskMap[task.id].computeEndDate();
  }

  const output: SchedulableTask[] = [];

  function addToOutput(task: SchedulableTask) {
    output.push(task);
  }

  let input = tasks.slice();
  
  while (input.length > 0) {
    const newInput = [];
    for (const task of input) {
      if (task.dependencies.length == 0 && taskMap[task.id].weakDependencies.length == 0) {
        addToOutput(taskMap[task.id]);
        continue;
      }
      const deps = task.dependencies.concat(taskMap[task.id].weakDependencies).map(a => taskMap[a].end);
      if (deps.includes(null)) {
        newInput.push(task);
        continue;
      }
      const ends = (deps as Date[]).map(a => a.getTime());
      taskMap[task.id].start = new Date(Math.max(...ends));
      taskMap[task.id].computeEndDate();
      addToOutput(taskMap[task.id]);
    }
    input = newInput;
  }

  return output;
}
