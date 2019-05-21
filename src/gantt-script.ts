type HTMLTask = {id: string, name: string, owner: string, duration: string, ancestors: string[], descendants: string[], arrows: string[]};

declare var tasks: HTMLTask[];

let taskElems: {[index: string]: {elem: HTMLElement, task: HTMLTask}} = {};
let arrows: {[index: string]: HTMLElement} = {};

tasks.forEach(task => {
  const elem = document.querySelector(`#${task.id} .message`) as HTMLElement;
  if (elem == null) {
    return;
  }
  taskElems[task.id] = {elem, task};
  task.arrows.forEach(arrow => {
    if (!arrows[arrow]) {
      let arrowElem = document.getElementById(arrow);
      if (arrowElem) {
        arrows[arrow] = arrowElem;
      }
    }
  });
  elem.onmouseover = (ev) => {
    elem.classList.add('selected');
    for (const id of task.ancestors.concat(task.descendants)) {
      if (taskElems[id]) {
        taskElems[id].elem.classList.add('selected');
      }
    }
    for (const arrow of task.arrows) {
      arrows[arrow].classList.add('selected');
    }
    elem.innerHTML = `${task.owner} (${task.duration})`;
  };
  elem.onmouseout = (ev) => {
    elem.classList.remove('selected');
    elem.innerHTML = '';
    for (const id of task.ancestors.concat(task.descendants)) {
      if (taskElems[id]) {
        taskElems[id].elem.classList.remove('selected');
      }
    }
    for (const arrow of task.arrows) {
      arrows[arrow].classList.remove('selected');
    }
  }
});

