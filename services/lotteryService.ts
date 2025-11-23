
interface DrawHistory {
  numbers: number[];
  stars: number[];
}

interface FrequencyMap {
  [key: number]: number;
}

export interface GeneratedKey {
  numbers: number[];
  stars: number[];
  hotNumbers: number[]; // Which of the generated numbers were "hot"
  coldNumbers: number[]; // Which were "cold"
}

// Helper: Generate random integer between min and max (inclusive)
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: Generate a unique set of random numbers
const generateSet = (count: number, min: number, max: number): number[] => {
  const set = new Set<number>();
  while (set.size < count) {
    set.add(randomInt(min, max));
  }
  return Array.from(set).sort((a, b) => a - b);
};

// Simulate 1 year of draws (approx 104 draws) to build "history"
const simulateHistory = (): DrawHistory[] => {
  const history: DrawHistory[] = [];
  for (let i = 0; i < 104; i++) {
    history.push({
      numbers: generateSet(5, 1, 50),
      stars: generateSet(2, 1, 12)
    });
  }
  return history;
};

// Analyze frequency of numbers in history
const analyzeFrequencies = (history: DrawHistory[], type: 'numbers' | 'stars'): FrequencyMap => {
  const map: FrequencyMap = {};
  history.forEach(draw => {
    const list = type === 'numbers' ? draw.numbers : draw.stars;
    list.forEach(num => {
      map[num] = (map[num] || 0) + 1;
    });
  });
  return map;
};

// Split into Hot (Top 50%) and Cold (Bottom 50%)
const splitHotCold = (frequencies: FrequencyMap, maxNumber: number) => {
  const allNumbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
  
  // Sort numbers by frequency desc
  allNumbers.sort((a, b) => (frequencies[b] || 0) - (frequencies[a] || 0));
  
  const mid = Math.floor(allNumbers.length / 2);
  return {
    hot: allNumbers.slice(0, mid),
    cold: allNumbers.slice(mid)
  };
};

// The core algorithm
export const generateMagicKey = (): GeneratedKey => {
  // 1. Get Data
  const history = simulateHistory();
  const numFreq = analyzeFrequencies(history, 'numbers');
  const starFreq = analyzeFrequencies(history, 'stars');

  // 2. Classify
  const nums = splitHotCold(numFreq, 50);
  const stars = splitHotCold(starFreq, 12);

  // 3. Selection Logic (Balanced)
  // Numbers: 3 Hot, 2 Cold
  const selectedHotNums = shuffle(nums.hot).slice(0, 3);
  const selectedColdNums = shuffle(nums.cold).slice(0, 2);
  
  // Stars: 1 Hot, 1 Cold
  const selectedHotStars = shuffle(stars.hot).slice(0, 1);
  const selectedColdStars = shuffle(stars.cold).slice(0, 1);

  // 4. Combine and Sort
  const finalNumbers = [...selectedHotNums, ...selectedColdNums].sort((a, b) => a - b);
  const finalStars = [...selectedHotStars, ...selectedColdStars].sort((a, b) => a - b);

  return {
    numbers: finalNumbers,
    stars: finalStars,
    hotNumbers: selectedHotNums,
    coldNumbers: selectedColdNums
  };
};

// Fisher-Yates Shuffle
const shuffle = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};
