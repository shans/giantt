import {SchedulableTask, InputTask} from "./data-model";

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
