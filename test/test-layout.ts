import {assert} from 'chai'
import {InputTask, SchedulableTask} from '../src/data-model';
import {improvedLayout} from '../src/layout-gantt';
import {rollupGantt} from '../src/rollup-gantt';

function assertTimesMatch(actual: Date | null, expected: Date | null) {
  if (actual == null || expected == null) {
    assert.isNull(actual);
    assert.isNull(expected);

  } else {
    assert.equal(actual.getFullYear(), expected.getFullYear(), `Expected ${expected.toDateString()} but got ${actual.toDateString()} (year mismatch)`);
    assert.equal(actual.getMonth(), expected.getMonth(), `Expected ${expected.toDateString()} but got ${actual.toDateString()} (month mismatch)`);
    assert.equal(actual.getDate(), expected.getDate(), `Expected ${expected.toDateString()} but got ${actual.toDateString()} (day mismatch)`);
  }
}

function assertTaskSpans(task: SchedulableTask, start: Date | null, end: Date | null) {
  assertTimesMatch(task.start, start);
  assertTimesMatch(task.end, end);
}

type TestTaskProperties = {
  owner?: string;
  rollup?: string;
}

class TestTaskMaker {
  tasks: InputTask[] = [];
  id = 1;
  owner = '';
  rollup = '';
  newTask(duration: string, props?: TestTaskProperties) {
    this.applyPropertiesAndCheck(props);
    this.tasks.push(new InputTask(`task${this.id}`, `task #${this.id++}`, this.owner, '', '', duration, '', '0%', '', this.rollup));
    return this;
  }

  newTaskWithStart(start: string, duration: string, props?: TestTaskProperties) {
    this.applyPropertiesAndCheck(props);    
    this.tasks.push(new InputTask(`task${this.id}`, `task #${this.id++}`, this.owner, start, '', duration, '', '0%', '', this.rollup));
    return this;
  }

  newFixedTask(start: string, end: string, props?: TestTaskProperties) {
    this.applyPropertiesAndCheck(props);
    this.tasks.push(new InputTask(`task${this.id}`, `task #${this.id++}`, this.owner, start, end, '', '', '0%', '', this.rollup));
    return this;
  }

  setOwner(owner: string) {
    this.owner = owner;
    return this;
  }

  setRollup(rollup: string) {
    this.rollup = rollup;
    return this;
  }

  private applyPropertiesAndCheck(props?: TestTaskProperties) {
    if (props) {
      if (props.owner) {
        this.owner = props.owner;
      }
      if (props.rollup) {
        this.rollup = props.rollup;
      }
    }

    if (this.owner === '') {
      throw new Error('Please set an owner');
    }
  }
}

describe('improved layout', () => {
  it('schedules in description order', () => {
    let tasks = [
      new InputTask('task1', 'The first task', 'owner1', 'Jan 1, 2019', '', '2w', '', '0%', '', ''),
      new InputTask('task2', 'The second task', 'owner1', '', '', '3w', '', '0%', '', ''),
      new InputTask('task3', 'The third task', 'owner1', '', '', '4w', '', '0%', '', '')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 3);
    assertTaskSpans(result[0], new Date('Jan 1, 2019'), result[1].start);
    assertTaskSpans(result[2], result[1].end, new Date('Mar 5, 2019'));
    assert.deepEqual(result.map(a => a.id), tasks.map(a => a.id));
  });
  
  it('schedules fixed tasks in the middle of floating tasks', () => {
    let tasks = [
      new InputTask('floating', 'Floating task', 'owner1', 'Jan 1, 2019', '', '5w', '', '0%', '', ''),
      new InputTask('fixed', 'Fixed task', 'owner1', 'Jan 15, 2019', 'Jan 29, 2019', '', '', '0%', '', '')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 2);
    assertTaskSpans(result[0], new Date('Jan 1, 2019'), new Date('Feb 19, 2019'));
  });

  it('co-schedules fixed tasks with multiple owners', () => {
    let tasks = [
      new InputTask('floating', 'Floating task', 'owner1', 'Jan 1, 2019', '', '5w', '', '0%', '', ''),
      new InputTask('floating2', 'Floating task 2', 'owner2', 'Jan 8, 2019', '', '3w', '', '0%', '', ''),
      new InputTask('fixed', 'Fixed task', 'owner1, owner2', 'Jan 15, 2019', 'Jan 29, 2019', '', '', '0%', '', '')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 3);
    assertTaskSpans(result[0], new Date('Jan 1, 2019'), new Date('Feb 19, 2019'));
    assertTaskSpans(result[2], new Date('Jan 8, 2019'), new Date('Feb 12, 2019'));
  });

  it('respects priority dictates', () => {
    let tasks = [
      new InputTask('task1', 'The first task', 'owner1', '', '', '2w', '', '0%', '3', ''),
      new InputTask('task2', 'The second task', 'owner1', 'Jan 1, 2019', '', '3w', '', '0%', '1', ''),
      new InputTask('task3', 'The third task', 'owner1', '', '', '4w', '', '0%', '2', '')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 3);
    assert.equal(result[0].id, 'task2');
    assert.equal(result[1].id, 'task3');
    assert.equal(result[2].id, 'task1');
  });

  it('allocates priority based on last seen priority value', () => {
    let tasks = [
      new InputTask('t1', 'The first task', 'owner1', '', '', '2w', '', '0%', '2', ''),
      new InputTask('t2', 'The first task 2', 'owner1', '', '', '2w', '', '0%', '', ''),
      new InputTask('t3', 'The second task', 'owner1', 'Jan 1, 2019', '', '3w', '', '0%', '1', ''),
      new InputTask('t4', 'The second task 2', 'owner1', '', '', '2w', '', '0%', '', ''),
      new InputTask('t5', 'The second task 3', 'owner1', '', '', '2w', '', '0%', '', ''),
      new InputTask('t6', 'The third task', 'owner1', '', '', '4w', '', '0%', '3', '')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 6);
    assert.deepEqual(result.map(a => a.id), ['t3','t4','t5','t1','t2','t6']);
  });

  it('rolls up a set of tasks', () => {
    let tasks = [
      new InputTask('t1', 'The first task', 'owner1', '', '', '2w', '', '0%', '2', 'A'),
      new InputTask('t2', 'The first task 2', 'owner1', '', '', '2w', '', '0%', '', 'B'),
      new InputTask('t3', 'The second task', 'owner1', 'Jan 1, 2019', '', '3w', '', '0%', '1', 'A'),
      new InputTask('t4', 'The second task 2', 'owner1', '', '', '2w', '', '0%', '', 'B'),
      new InputTask('t5', 'The second task 3', 'owner1', '', '', '2w', '', '0%', '', 'C'),
      new InputTask('t6', 'The third task', 'owner1', '', '', '4w', '', '0%', '3', 'C')
    ];

    const layout = improvedLayout(tasks);
    const rollup = rollupGantt(layout);

    assert.equal(rollup.length, 3);
    assertTaskSpans(rollup[0], new Date('Jan 1, 2019'), new Date('Mar 5, 2019'));
    assertTaskSpans(rollup[1], new Date('Jan 22, 2019'), new Date('Mar 19, 2019'));
    assertTaskSpans(rollup[2], new Date('Feb 5, 2019'), new Date('Apr 16, 2019'));
  });

  it(`rolls up tasks with overlapping subtasks into separate pieces`, () => {
    let tasks = new TestTaskMaker().setOwner('owner1').setRollup('A')
      .newTaskWithStart('Jan 1, 2019', '2w')
      .newTask('2w')
      .newTask('2w', {rollup: 'B'}).tasks;

    tasks[1].rollup.push('B');

    const layout = improvedLayout(tasks);
    const rollup = rollupGantt(layout);

    assert.equal(rollup.length, 2);
    assertTaskSpans(rollup[0], new Date('Jan 1, 2019'), new Date('Jan 29, 2019'));
    assertTaskSpans(rollup[1], new Date('Jan 15, 2019'), new Date('Feb 12, 2019'));
  });
});
