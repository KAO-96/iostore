import { useState, useEffect } from 'react';
import { subScribe, unSubScribe } from './pub';

export default namespace => {
  const [, setState] = useState();
  useEffect(() => {
    subScribe(namespace, setState);
    return () => unSubScribe(namespace, setState);
  }, []);
};
