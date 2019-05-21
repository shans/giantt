import {Task, SchedulableTask} from "./data-model";

export const ownerThenStart = chain([ownerSort, startSort]);
export const dependencyThenOwnerThenStart = chain([rankSort, ownerSort, startSort]);
export const ownerThenDependencyThenStart = chain([ownerSort, rankSort, startSort]);

type SortFunction<T> = (a: T, b: T) => -1 | 0 | 1;

export function chain<T>(functions: SortFunction<T>[]): SortFunction<T> {
  return (a: T, b: T) => {
    for (const fun of functions) {
      const r = fun(a, b);
      if (r !== 0) {
        return r;
      }
    }
    return 0;
  }
}

function partition<T>(list: T[], predicate: (value: T) => boolean) {
  const yes: T[] = [], no: T[] = [];
  list.forEach(value => {
    if (predicate(value)) {
      yes.push(value);
    } else {
      no.push(value);
    }
  });
  return {yes, no}
}

export function goodSort(list: SchedulableTask[]) {
  let owners: {[index: string]: string} = {};
  list.forEach(task => {
    owners[task.id] = task.owner;
  })
  let ownerDepCounts: {[index: string]: {reverse: number, forward: number}} = {};
  list.forEach(task => {
    if (!ownerDepCounts[task.owner]) {
      ownerDepCounts[task.owner] = {reverse: 0, forward: 0};
    }
    let differentReverseDeps = task.reverseDependencies.filter(dep => owners[dep] !== task.owner);
    let differentForwardDeps = task.dependencies.filter(dep => owners[dep] !== task.owner);

    ownerDepCounts[task.owner].reverse += differentReverseDeps.length;
    ownerDepCounts[task.owner].forward += differentForwardDeps.length;

  });

  list = list.slice();

  function depCountSort(a: SchedulableTask, b: SchedulableTask) {
    let aSum = ownerDepCounts[a.owner].forward + ownerDepCounts[a.owner].reverse;
    let bSum = ownerDepCounts[b.owner].forward + ownerDepCounts[b.owner].reverse;
    if (aSum < bSum) {
      return -1;
    }
    if (aSum > bSum) {
      return 1;
    }
    if (ownerDepCounts[a.owner].forward < ownerDepCounts[b.owner].forward) {
      return -1;
    }
    if (ownerDepCounts[a.owner].forward > ownerDepCounts[b.owner].forward) {
      return 1;
    }
    if (ownerDepCounts[a.owner].reverse < ownerDepCounts[b.owner].reverse) {
      return -1;
    }
    if (ownerDepCounts[a.owner].reverse > ownerDepCounts[b.owner].reverse) {
      return 1;
    }


    return 0;
  }

  list.sort(chain([depCountSort, ownerSort, startSort]));
  return list; //dependencyFilter(list);
}

export function dependencyFilter(list: SchedulableTask[]) {
  let output: SchedulableTask[] = [];
  let outputIDSet = new Set<string>();
  let deferred: SchedulableTask[] = [];
  while (list.length > 0) {
    list.forEach(task => {
      deferred.forEach(task => {
        let stillMissing = task.dependencies.filter(dep => !outputIDSet.has(dep));
        if (stillMissing.length == 0) {
          output.push(task);
          outputIDSet.add(task.id);
        }
      });
      deferred = deferred.filter(task => !outputIDSet.has(task.id));
      let stillMissing = task.dependencies.filter(dep => !outputIDSet.has(dep));
      if (stillMissing.length > 0) {
        deferred.push(task);
      } else {
        output.push(task);
        outputIDSet.add(task.id);
      }
    });
    list = deferred;
  }
  return output;
}

export function topoSort(list: SchedulableTask[]) {
  let result: SchedulableTask[] = [];
  let {yes: input, no: remainder} = partition(list, task => task.dependencies.length === 0);
  input.forEach(task => task.rank = 0);
  let rank = 1;
  while (input.length > 0) {
    result.push(input[0]);
    input = input.slice(1);
    let ids = result.map(a => a.id);
    let part = partition(remainder, task => {
      for (const dependency of task.dependencies) {
        if (!ids.includes(dependency)) {
          return false;
        }
      }
      return true
    });
    remainder = part.no;
    part.yes.forEach(task => { task.rank = rank; input.push(task)});
    rank++;
  }
  return result;
}

export function rankSort(a: SchedulableTask, b: SchedulableTask) {
  if (a.rank > b.rank) {
    return 1;
  }
  if (a.rank < b.rank) {
    return -1;
  }
  return 0;
}

export function ownerSort(a: SchedulableTask, b: SchedulableTask) {
  if (a.owner == '' && b.owner == '') {
    return 0;
  }
  if (a.owner == '') {
    return 1;
  }
  if (b.owner == '') {
    return -1;
  }
  if (a.owner > b.owner) {
    return 1;
  }
  if (a.owner < b.owner) {
    return -1;
  }
  return 0;
}

export function startSort(a: SchedulableTask, b: SchedulableTask) {
  if (a.start == null && b.start == null) {
    return 0;
  }
  if (a.start == null) {
    return - 1;
  }
  if (b.start == null) {
    return 1;
  }
  if (a.start.getTime() > b.start.getTime()) {
    return 1;
  }
  if (a.start.getTime() < b.start.getTime()) {
    return -1;
  }
  return 0;
}
