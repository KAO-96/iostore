import { addProxy } from './util';
import stores from './stores';
import useReactHooks from './useReactHooks';

export default () =>
  addProxy(
    {},
    {
      get(target, key) {
        // no such nammespace
        // 通过getter, validate你可以access的key
        if (!stores[key]) throw new Error(`Not found the store: ${key}.`);

        useReactHooks(key);
        return stores[key];
      },
    }
  );
