import { isPromise, isUndefined, addProxy, isFunction } from './util';
import { broadcast } from './pub';
import stores from './stores';
import useStore from './useStore';

const disableProps = ['loading', 'stores', 'useStore'];

export default config => {
  const { namespace = '', ...rest } = config;
  let service;
  let isChanged = false;

  // reducers => stored config's key (typeof function)
  // state    => stored config's key (typeof notFunction)
  const reducers = {};
  const state = { namespace };

  // safe code
  if (!namespace) {
    throw new Error('Invalid params, namespace is required.');
  }
  if (stores[namespace]) {
    return stores[namespace];
  }

  // safe code (props doesn't support)
  disableProps.forEach(key => {
    if (!isUndefined(rest[key])) {
      throw new Error(`${key} is not allowd in params.`);
    }
  });

  // distinguish function, notFunction
  Object.keys(rest).forEach(key => {
    if (isFunction(rest[key])) {
      reducers[key] = rest[key];
    } else {
      state[key] = rest[key];
    }
  });

  // 检测方法是否有被触发
  const checkReducersStatus = name => {
    const keys = Object.keys(reducers);
    for (let i = 0; i < keys.length; i++) {
      if (service[keys[i]][name]) return true;
    }
    return false;
  };

  const handler = {
    // 只会在有reducers的方法改变state的值时, 触发setter
    set(target, key, newValue) {
      //
      if (disableProps.includes(key) || isFunction(newValue)) {
        target[key] = newValue;
        return true;
      }

      // 不允许通过模块的方法外的形式改变state
      // setter被触发时, 检测方法有被触发, 没有则抛出异常
      if (!checkReducersStatus('unlock')) {
        console.error(
          'Do not modify data within components, call a method of service to update the data.',
          `namespace:${namespace}, key:${key}, value:${newValue}`
        );
      }

      // if state's key changed
      if (target[key] !== newValue) {
        isChanged = true;
      }
      target[key] = addProxy(newValue, handler);
      return true;
    },
  };

  // 这里的state只会在 (有其他方法改变state值的情况下)
  // 触发handler的setter
  service = addProxy(state, handler);

  const checkUpdateAndBroadcast = () => {
    if (isChanged) {
      isChanged = false;
      // 将订阅queue的所有setState全部执行一遍, 触发组件render
      broadcast(namespace, Math.random());
    }
  };

  // traverse properties of reducers (must be function)
  Object.keys(reducers).forEach(key => {
    // 将reducers的key, 赋值给已添加Proxy的service上
    // 调用方法, 走的是这边的逻辑
    service[key] = (...args) => {
      // 先在方法的key挂载一个标识
      service[key].unlock = true;
      // 通过apply执行一遍原有函数
      // handler的setter会在这里同步触发, setter跑完, 后面的代码才会开始执行
      const promise = reducers[key].apply(service, args);

      // 如果reducers里的key不是异步函数
      if (!isPromise(promise)) {
        service[key].unlock = false;
        checkUpdateAndBroadcast();
        return promise;
      }

      // 如果reducers里的key是异步函数
      isChanged = true;
      service[key].loading = true;
      // service[key].unlock = true;
      checkUpdateAndBroadcast();

      return new Promise((resolve, reject) => {
        promise
          .then(resolve)
          .catch(reject)
          .finally(() => {
            isChanged = true;
            service[key].loading = false;
            service[key].unlock = false;
            checkUpdateAndBroadcast();
          });
      });
    };

    service[key].loading = false;
    service[key].unlock = false;
  });

  Object.defineProperty(service, 'loading', {
    get() {
      // 全局变量, 标识这个namespace是否有仍在执行中的异步函数
      return checkReducersStatus('loading');
    },
  });

  Object.assign(service, {
    stores,
    useStore: () => useStore()[namespace],
  });

  stores[namespace] = service;
  return service;
};
