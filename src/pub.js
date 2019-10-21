const queue = {};

/**
 * 1. name: modulename, namespace
 * 2. boardcast => publish
 */

export const broadcast = (namespace, state) => {
  // 如果queue已存在namespace
  if (!queue[namespace]) return;

  // queue只会针对对应的namespace里的触发setState(即组件更新)
  queue[namespace].forEach(setState => setState(state));
};

export const subScribe = (namespace, setState) => {
  if (!queue[namespace]) queue[namespace] = [];
  queue[namespace].push(setState);
};

export const unSubScribe = (namespace, setState) => {
  if (!queue[namespace]) return;

  const index = queue[namespace].indexOf(setState);
  if (index !== -1) queue[namespace].splice(index, 1);
};
