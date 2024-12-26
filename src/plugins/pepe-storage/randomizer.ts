import type { GetPepe, NormalUrl, PepeStorage, RareUrl, UltraRare } from '.'

export const shuffle = <T>(array: Array<T>) => {
  let currentIndex = array.length
  let randomIndex = -1

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

const shuffleGetter = <T>(pepes: T[]): GetPepe<T> => {
  const reshuffle = () => shuffle([...pepes])
  let stack: T[] = reshuffle()
  return () => {
    if (stack.length < 0) {
      stack = reshuffle()
    }
    const result = stack.pop()
    if (!result) {
      throw new Error('Exhausted stack, nothing returned')
    }
    return result
  }
}

interface PepeRandomizer {
  randomUltra: GetPepe<UltraRare>
  randomRare: GetPepe<RareUrl>
  randomNormal: GetPepe<NormalUrl>
}

export const buildRandomizer = (storage: PepeStorage): PepeRandomizer => {
  return {
    randomUltra: shuffleGetter(storage.ultra),
    randomRare: shuffleGetter(storage.rare),
    randomNormal: shuffleGetter(storage.normal),
  }
}
