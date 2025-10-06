/* eslint-disable @typescript-eslint/no-explicit-any */

import { clsx, type ClassValue } from "clsx"
import { stat } from "fs";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const episodeTypeToStats: Record<string, (keyof any)[]> = {
  acting: ["Acting", "Comedy"],
  branding: ["Acting", "Comedy"],
  commercial: ["Acting", "Comedy"],
  comedy: ["Comedy", "Acting"],
  design: ["Design", "Runway"],
  dancing: ["Dance"],
  singing: ["Singing", "Dance"],
  improv: ["Comedy", "Acting"],
  roast: ["Comedy"],
  parody: ["Comedy", "Acting"],
  makeover: ["Design", "Runway"],
  musical: ['Acting', 'Singing', 'Dance', 'Comedy'],
  "nonelim": ["Acting", "Comedy", "Dance", "Design", "Singing", "Runway"],
  "non elim": ["Acting", "Comedy", "Dance", "Design", "Singing", "Runway"],
  default: ["Acting", "Comedy", "Dance", "Design", "Singing", "Runway"],
};

export function mainChallenge(
  trackRecord: any[],
  episodeNumber: string | number,
  nonElimination: boolean = false,
  episodeType: string,
  seasonStyle: string
) {
  //const episodeNum = Number(episodeNumber);

  const isFinale = episodeType.toLowerCase().includes("finale");
  const episodeTypeKeys = episodeType
    .toLowerCase()
    .split(",")
    .map((key) => key.trim());
  const isSplitPremiereNonElim = episodeTypeKeys.some(
    (key) => key.replace(/\s+/g, "") === "nonelim"
  );

  if (isFinale) {
    const activeQueens = trackRecord.filter(q => !q.isEliminated); // Only active queens
    const maxWins = Math.max(...activeQueens.map(q => q.wins)); // Max wins among active

    const finalists = activeQueens
      .map((q) => (q.wins === maxWins ? trackRecord.indexOf(q) : -1))
      .filter(idx => idx !== -1);

    const winnerIndex = finalists[Math.floor(Math.random() * finalists.length)]; // Random winner

    return trackRecord.map((q, idx) => {
      //console.log(q);
      if (q.isEliminated) return q; // do nothing
      return {
        ...q,
        placements: [
          ...q.placements,
          {
            episodeNumber,
            placement: idx === winnerIndex ? "win" : "finale", // Only update active queens
          },
        ],
      };
    });
  }

  // --- Normal episode logic ---
  //const tempScores: { id: string; queen: string; episodeNumber: string | number; score: number }[] = [];
  const tempScores: {
    id: string;
    queen: string;
    episodeNumber: string | number;
    baseStat: number;
    score: number;
    randomFactor: number;
    bias: number;
    statIncrease: number;
    relevantStatsLen: number;
    wins: number;
    highs: number;
    lows: number;
    bottoms: number;
  }[] = [];

  const scoredRecord = trackRecord.map(q => {
    if (q.isEliminated) return { ...q };

    //const tempScore = Math.floor(Math.random() * 100) + 1;
    const { baseStat, finalScore, randomFactor, bias, statIncrease, relevantStats } = getEpisodeScore(q, episodeType, Number(episodeNumber));

    tempScores.push({
      id: q.id,
      queen: q.name,
      episodeNumber,
      baseStat: baseStat,
      score: finalScore,
      randomFactor,
      bias,
      statIncrease: statIncrease,
      relevantStatsLen: relevantStats.length,
      wins: q.wins,
      highs: q.highs,
      lows: q.lows,
      bottoms: q.bottoms
    });
    //tempScores.push({ id: q.id, queen: q.name, episodeNumber, score: tempScore });

    return {
      ...q,
      scores: [...q.scores, {
        episodeNumber,
        score: finalScore,
        baseStat: baseStat,
        statIncrease: statIncrease,
        relevantStatsLen: relevantStats.length,
        bias: bias,
        wins: q.wins,
        highs: q.highs,
        lows: q.lows,
        bottoms: q.bottoms
      }]
    };
  });

  tempScores.sort((a, b) => b.score - a.score);

  let topQueens = tempScores.slice();
  let highQueens: typeof tempScores = [];
  let topTwoQueens: typeof tempScores = [];
  let bottomQueens: typeof tempScores = [];
  let eliminatedId: string | null = null;
  let topTwoWinnerId: string | null = null;
  let bottomCount = 0;

  if (isSplitPremiereNonElim) {
    const topSlots = Math.min(4, tempScores.length);
    topQueens = tempScores.slice(0, topSlots);
    topTwoQueens = topQueens.slice(0, Math.min(2, topQueens.length));
    highQueens = topQueens.slice(topTwoQueens.length, Math.min(topSlots, topTwoQueens.length + 2));

    if (topTwoQueens.length > 0) {
      topTwoWinnerId = lipsyncForTheWin(topTwoQueens) || topTwoQueens[0].id;
    }
  } else {
    const [topCount, bottomGroupCount] = nittyGritty({ size: tempScores.length });

    topQueens = tempScores.slice(0, topCount);
    highQueens = topQueens.slice(1);
    bottomQueens = tempScores.slice(-bottomGroupCount);
    bottomCount = bottomQueens.length;
    const regularBottomQueens = bottomQueens.slice(1);

    if (!nonElimination) {
      if (topCount === 2 && bottomGroupCount === 2) {
        eliminatedId = lipsync(bottomQueens);
      } else {
        eliminatedId = lipsync(regularBottomQueens);
      }
    }
  }
  //const = nonElimination ? null : lipsync(bottomQueens.slice(1));

  /*
  if (topCount == 2 && bottomCount == 2) {
    console.log(JSON.stringify(tempScores) + '\n' + nittyGritty({ size: tempScores.length }));
    console.log('top: ' + JSON.stringify(topQueens));
    console.log('bottom ' + JSON.stringify(bottomQueens));
  } */

  const updatedRecord = scoredRecord.map(q => {
    if (q.isEliminated) return { ...q };

    if (isSplitPremiereNonElim) {
      if (topTwoQueens.some(t => t.id === q.id)) {
        const isWinner = q.id === topTwoWinnerId;
        const placementType = isWinner ? 'win' : 'top2';
        if (isWinner) {
          return {
            ...q,
            wins: q.wins + 1,
            placements: [...q.placements, { episodeNumber, placement: placementType }]
          };
        }

        return {
          ...q,
          highs: q.highs + 1,
          placements: [...q.placements, { episodeNumber, placement: placementType }]
        };
      }

      if (highQueens.some(h => h.id === q.id)) {
        return {
          ...q,
          highs: q.highs + 1,
          placements: [...q.placements, { episodeNumber, placement: 'high' }]
        };
      }

      return {
        ...q,
        placements: [...q.placements, { episodeNumber, placement: 'safe' }]
      };
    }

    if (topQueens[0]?.id === q.id) {
      return { ...q, wins: q.wins + 1, placements: [...q.placements, { episodeNumber, placement: 'win' }] };
    }

    if (highQueens.some(t => t.id === q.id)) {
      return { ...q, highs: q.highs + 1, placements: [...q.placements, { episodeNumber, placement: 'high' }] };
    }

    if (bottomQueens[0]?.id === q.id && bottomCount > 2) {
      return { ...q, lows: q.lows + 1, placements: [...q.placements, { episodeNumber, placement: 'low' }] };
    }

    if (bottomQueens.some(b => b.id === q.id)) {
      const isEliminatedQueen = q.id === eliminatedId;
      return {
        ...q,
        bottoms: q.bottoms + 1,
        isEliminated: isEliminatedQueen,
        placements: [...q.placements, { episodeNumber, placement: 'bottom' }]
      };
    }

    return { ...q, placements: [...q.placements, { episodeNumber, placement: 'safe' }] };
  });

  return updatedRecord;
}

function nittyGritty({ size }: { size: number }) {
  // Explicit rules for 4 queens left
  if (size === 4) {
    // Return topCount = 2 (winner + high), bottomCount = 2
    return [2, 2];
  }

  const placementReserve: Record<number, [number, number]> = {
    5: [2, 3],
    6: [3, 3],
    7: [4, 3]
  };

  if (placementReserve[size]) return placementReserve[size];
  return [3, 3]; // default
}

function calculateLipsyncScores(queens: { id: string; queen: string; wins: number; highs: number; lows: number; bottoms: number }[]) {
  return queens.map((queen) => ({
    queenId: queen.id,
    name: queen.queen,
    score:
      Math.floor(Math.random() * 10) + 1 +
      1 * queen.wins +
      0.5 * queen.highs -
      0.6 * queen.lows -
      2 * queen.bottoms,
  }));
}

function lipsync(bottomQueens: { id: string; queen: string; wins: number; highs: number; lows: number; bottoms: number }[]) {
  const bottomResults = calculateLipsyncScores(bottomQueens);

  if (bottomResults.length === 0) {
    return null;
  }

  let lowestScore = Infinity;
  let lowestId: string | null = null;

  for (const q of bottomResults) {
    if (q.score < lowestScore) {
      lowestScore = q.score;
      lowestId = q.queenId;
    }
  }
  return lowestId;
}

function lipsyncForTheWin(topQueens: { id: string; queen: string; wins: number; highs: number; lows: number; bottoms: number }[]) {
  const topResults = calculateLipsyncScores(topQueens);

  if (topResults.length === 0) {
    return null;
  }

  let highestScore = -Infinity;
  let highestId: string | null = null;

  for (const q of topResults) {
    if (q.score > highestScore) {
      highestScore = q.score;
      highestId = q.queenId;
    }
  }

  return highestId;
}

function getQueenBiasFromStats(queen: any): number {
  let bias = 0;

  bias += queen.wins * 8;
  bias += queen.highs * 5;
  bias -= queen.bottoms * 12;
  bias -= queen.lows * 8;

  return bias;
}

function getEpisodeScore(queen: any, episodeType: string, episodeNumber: number) {
  const typeKeys = episodeType.toLowerCase().split(",");
  let relevantStats: string[] = [];

  typeKeys.forEach(key => {
    if (episodeTypeToStats[key]) {
      relevantStats = [...relevantStats, ...episodeTypeToStats[key] as string[]];
    }
  });

  relevantStats = [...new Set(relevantStats)]; // Remove duplicates
  if (relevantStats.length === 0) {
    console.log(episodeType);
    relevantStats = episodeTypeToStats["default"] as string[];
  }

  const baseStat = Math.floor(Math.random() * 100) + 1;
  let statIncrease = 0;
  for (const r in relevantStats) {
    //console.log('episode ' + episodeNumber + ': ' + queen.name +  ' ' + queen.stats[relevantStats[r]] +  ' ' + relevantStats.length);
    statIncrease += queen.stats[relevantStats[r]];
  }

  statIncrease = statIncrease / relevantStats.length;


  //console.log(queen.name + ' ' + baseStat + ' ' + finalScore);
  //relevantStats.reduce((sum, stat) => sum + (queen.stats[stat] || 50), 0) / relevantStats.length;

  const randomFactor = Math.floor(Math.random() * 20) - 10;
  const bias = getQueenBiasFromStats(queen);

  const finalScore = (baseStat + statIncrease);
  //const finalScore = Math.min(100, Math.max(1, baseStat + randomFactor + bias));

  return {
    baseStat,
    finalScore,
    randomFactor,
    bias,
    statIncrease,
    relevantStats
  };
}

