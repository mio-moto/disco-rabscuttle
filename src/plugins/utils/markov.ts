export const buildMarkovChain = <T>(order = 2) => {
  const items: MarkovChainItems<T> = buildMarkovChainItems();
  const terminals: MarkovTerminalItems<T> = buildWeightedDictionary();

  const learnWithPrevious = (previous: ChainState<T>, next: T) => {
    const weights = items.getOrCreateValue(previous, () =>
      buildWeightedDictionary()
    );
    weights.incrementValue(next, 1);
  };

  return {
    learn: (items: T[]) => {
      if (items.length === 0) {
        return;
      }
      const previous = buildFixedQueue<T>(order);
      items.forEach(item => {
        const key = buildChainstate(previous.data);
        learnWithPrevious(key, item);
        previous.enqueue(item);
      });

      const terminalKey = previous.data;
      terminals.incrementValue(terminalKey, 1);
    },

    walk: (previous?: T[], maxLength = 350) => {
      previous = previous ?? [];
      const returnvalue: T[] = [];
      const state = buildFixedQueue<T>(order);
      previous.forEach(x => state.enqueue(x));

      for (let i = 0; i < maxLength; i++) {
        const key = buildChainstate(state.data);
        const weights = items.get(key);
        if (!weights) {
          break;
        }

        const terminalWeight = terminals.get(key.items) ?? 0;
        const value = randomNumberBetween(
          1,
          weights.totalWeight + terminalWeight
        );
        if (value > weights.totalWeight) {
        }

        let currentWeight = 0;
        [...weights.keys()].every(k => {
          const v = weights.get(k)!;
          currentWeight += v;
          if (currentWeight >= value) {
            returnvalue.push(k);
            state.enqueue(k);
            return false;
          }
          return true;
        });
      }
      return returnvalue;
    },
  };
};

function randomNumber(max: number): number {
  return randomNumberBetween(0, max);
}

function randomNumberBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const buildMarkovChainItems = <T>() => {
  const data: Map<ChainState<T>, WeightedDictionary<T>> = new Map();
  return {
    ...data,
    getOrCreateValue: (
      key: ChainState<T>,
      createValue: () => WeightedDictionary<T>
    ) => {
      if (!data.has(key)) {
        data.set(key, createValue());
      }
      return data.get(key)!;
    },
  };
};

const buildFixedQueue = <T>(maxSize: number) => {
  const data: T[] = [];
  return {
    data: data,
    maxSize: maxSize,
    enqueue: (element: T) => {
      data.push(element);
      if (data.length > maxSize) {
        data.shift();
      }
    },
  };
};

const buildChainstate = <T>(items: T[]): ChainState<T> => {
  items = [...items];
  return {
    items: items,
    equals: (other: ChainState<T>) => {
      if (other.items.length !== items.length) {
        return false;
      }
      for (let i = 0; i < items.length; i++) {
        const left = items[i];
        const right = other.items[i];
        if (left !== right) {
          return false;
        }
      }
      return true;
    },
    toString: () => JSON.stringify(items),
  };
};

interface ChainState<T> {
  items: T[];
  equals: (other: ChainState<T>) => boolean;
  toString: () => string;
}

const buildWeightedDictionary = <T>() => {
  let totalWeight = 0;
  const data: Map<T, number> = new Map();

  return {
    ...data,
    totalWeight: totalWeight,
    setValue: (key: T, value: number) => {
      const delta = value - (data.get(key) ?? 0);
      totalWeight += delta;
      data.set(key, value);
    },
    incrementValue: (key: T, value: number) => {
      data.set(key, value + (data.get(key) ?? 0));
      totalWeight += value;
    },
    remove: (key: T) => {
      if (key in data) {
        return;
      }
      totalWeight -= data.get(key) ?? 0;
      data.delete(key);
    },
  };
};

type WeightedDictionary<T> = ReturnType<typeof buildWeightedDictionary<T>>;
type MarkovTerminalItems<T> = WeightedDictionary<T[]>;
type MarkovChainItems<T> = ReturnType<typeof buildMarkovChainItems<T>>;
