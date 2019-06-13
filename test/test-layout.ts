import {assert} from 'chai'
import {InputTask, SchedulableTask} from '../src/data-model';
import {improvedLayout} from '../src/layout-gantt';

function assertTimesMatch(actual: Date | null, expected: Date | null) {
  if (actual == null || expected == null) {
    assert.isNull(actual);
    assert.isNull(expected);

  } else {
    assert.equal(actual.getTime(), expected.getTime());
  }
}

function assertTaskSpans(task: SchedulableTask, start: Date | null, end: Date | null) {
  assertTimesMatch(task.start, start);
  assertTimesMatch(task.end, end);
}

describe('improved layout', () => {
  it('schedules in description order', () => {
    let tasks = [
      new InputTask('task1', 'The first task', 'owner1', 'Jan 1, 2019', '', '2w', '', '0%'),
      new InputTask('task2', 'The second task', 'owner1', '', '', '3w', '', '0%'),
      new InputTask('task3', 'The third task', 'owner1', '', '', '4w', '', '0%')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 3);
    assertTaskSpans(result[0], new Date('Jan 1, 2019'), result[1].start);
    assertTaskSpans(result[2], result[1].end, new Date('Mar 5, 2019'));
    assert.deepEqual(result.map(a => a.id), tasks.map(a => a.id));
  });
  
  it('schedules fixed tasks in the middle of floating tasks', () => {
    let tasks = [
      new InputTask('floating', 'Floating task', 'owner1', 'Jan 1, 2019', '', '5w', '', '0%'),
      new InputTask('fixed', 'Fixed task', 'owner1', 'Jan 15, 2019', 'Jan 29, 2019', '', '', '0%')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 2);
    assertTaskSpans(result[0], new Date('Jan 1, 2019'), new Date('Feb 19, 2019'));
  });

  it('co-schedules fixed tasks with multiple owners', () => {
    let tasks = [
      new InputTask('floating', 'Floating task', 'owner1', 'Jan 1, 2019', '', '5w', '', '0%'),
      new InputTask('floating2', 'Floating task 2', 'owner2', 'Jan 8, 2019', '', '3w', '', '0%'),
      new InputTask('fixed', 'Fixed task', 'owner1, owner2', 'Jan 15, 2019', 'Jan 29, 2019', '', '', '0%')
    ];

    const result = improvedLayout(tasks);
    assert.equal(result.length, 3);
    assertTaskSpans(result[0], new Date('Jan 1, 2019'), new Date('Feb 19, 2019'));
    assertTaskSpans(result[1], new Date('Jan 8, 2019'), new Date('Feb 12, 2019'));
  });
});
