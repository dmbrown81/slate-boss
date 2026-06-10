import { mulberry32, dateSeed, slateNumber } from './rng';
import { PLAYER_TEMPLATES, GAME_PAIRS, TEAMS } from './seedData';
import type { Player, Slate, Game, NewsEvent, SlateModifier, Position, RecentGame, SeasonStats } from '../types';

const MODIFIERS: SlateModifier[] = [
  {
    key: 'windy',
    label: '💨 Windy Week',
    description: 'Deep-threat WRs −20% ceiling. Ground games boosted.',
    apply: (p) => {
      if (p.archetype === 'boom_bust_wr') return { ceiling: p.ceiling * 0.8, boomChance: p.boomChance * 0.7 };
      if (p.archetype === 'workhorse_rb') return { displayedProjection: p.displayedProjection + 1.5, trueProjection: p.trueProjection + 1.5 };
      return {};
    },
  },
  {
    key: 'shootout',
    label: '🔥 Shootout Slate',
    description: 'All QB projections +10%, volatility up across the board.',
    apply: (p) => {
      if (p.position === 'QB') return { trueProjection: p.trueProjection * 1.1, displayedProjection: p.displayedProjection * 1.1, ceiling: p.ceiling * 1.15, boomChance: p.boomChance + 0.05 };
      return { volatility: Math.min(1, p.volatility + 0.05), boomChance: p.boomChance + 0.03 };
    },
  },
  {
    key: 'grind',
    label: '🏋️ Grind-It-Out',
    description: 'Workhorse RBs +1.5 floor. Pass-catchers suppressed.',
    apply: (p) => {
      if (p.archetype === 'workhorse_rb') return { floor: p.floor + 1.5, trueProjection: p.trueProjection + 1.0, displayedProjection: p.displayedProjection + 1.0 };
      if (p.position === 'WR' || p.position === 'TE') return { displayedProjection: p.displayedProjection * 0.95, trueProjection: p.trueProjection * 0.95 };
      return {};
    },
  },
  {
    key: 'primetime',
    label: '🌙 Primetime Chaos',
    description: 'Boom chances +5% across the board. High variance night.',
    apply: (p) => ({ boomChance: p.boomChance + 0.05, volatility: Math.min(1, p.volatility + 0.04) }),
  },
  {
    key: 'sloppy',
    label: '🌧️ Sloppy Conditions',
    description: 'DST boom chance doubled. QBs −10% ceiling.',
    apply: (p) => {
      if (p.position === 'DST') return { boomChance: Math.min(0.6, p.boomChance * 2) };
      if (p.position === 'QB') return { ceiling: p.ceiling * 0.9 };
      return {};
    },
  },
];

const NEWS_TEMPLATES = [
  {
    headline: '{name} limited in practice — projection now uncertain',
    detail: 'Wider variance expected. Could be a game-time call.',
    projectionDelta: -2.0,
    ownershipDelta: -8,
    ceilingDelta: 2,
  },
  {
    headline: '{name} questionable — backup could see extra work',
    detail: 'Monitor warmups. Ownership likely to drop.',
    projectionDelta: -3.0,
    ownershipDelta: -12,
    ceilingDelta: -1,
  },
  {
    headline: '{name} listed as full participant — boom game expected',
    detail: 'Fully healthy. Expect elevated ownership at chalk prices.',
    projectionDelta: 2.5,
    ownershipDelta: 8,
    ceilingDelta: 4,
  },
  {
    headline: 'Backup QB starting for {team} — pass-catcher ownership dropping',
    detail: 'WRs and TE on {team} facing uncertainty.',
    projectionDelta: -2.5,
    ownershipDelta: -10,
    ceilingDelta: -3,
  },
  {
    headline: '{name} in a revenge game spot — elevated motivation',
    detail: 'Former team matchup. Narratively spicy; DFS implications minor.',
    projectionDelta: 1.0,
    ownershipDelta: 5,
    ceilingDelta: 3,
  },
];

const RECENT_NOTES: Record<Position, string[]> = {
  QB: ['Clean pocket, efficient drives', 'Rushing bonus kept the floor alive', 'Two red-zone misses capped the ceiling', 'Pass volume spiked in catch-up mode'],
  RB: ['Handled strong early-down work', 'Passing-game role saved the day', 'Goal-line usage showed up', 'Game script squeezed second-half touches'],
  WR: ['Commanded first-read targets', 'Air yards were loud', 'Slot work kept the floor steady', 'One deep shot away from a smash'],
  TE: ['Red-zone routes stood out', 'Low volume, high leverage role', 'Worked the short middle often', 'Touchdown equity carried the line'],
  DST: ['Pressure rate created splash plays', 'Turnovers did the heavy lifting', 'Yards allowed muted the score', 'Sack upside stayed intact'],
};

function generateRecentGames(player: Player, rng: () => number, currentWeek: number): { recentGames: RecentGame[]; seasonStats: SeasonStats } {
  const recentGames: RecentGame[] = [];
  const gamesAvailable = Math.min(5, Math.max(0, currentWeek - 1));
  const usageBase = player.position === 'DST'
    ? 62
    : player.position === 'QB'
      ? 82
      : player.position === 'RB'
        ? player.archetype === 'workhorse_rb' ? 74 : 57
        : player.position === 'WR'
          ? player.archetype === 'alpha_wr' ? 76 : 59
          : player.archetype === 'redzone_te' ? 56 : 39;

  for (let i = 0; i < gamesAvailable; i++) {
    const variance = (rng() - 0.5) * player.volatility * 28;
    const formBump = player.form === 'hot' ? 1.08 : player.form === 'cold' ? 0.92 : 1;
    const points = Math.max(0, player.trueProjection * formBump + variance + (rng() < player.boomChance ? player.ceiling * 0.22 : 0));
    const usage = Math.max(8, Math.min(98, usageBase + (rng() - 0.5) * 22));
    const notes = RECENT_NOTES[player.position];
    recentGames.push({
      week: currentWeek - 1 - i,
      opponent: player.opponent,
      points: Math.round(points * 10) / 10,
      usage: Math.round(usage),
      note: notes[Math.floor(rng() * notes.length)],
    });
  }

  if (!recentGames.length) {
    return {
      recentGames,
      seasonStats: {
        games: 0,
        avgPoints: player.displayedProjection,
        avgUsage: Math.round(usageBase),
        highScore: 0,
        consistency: 0,
      },
    };
  }

  const avgPoints = recentGames.reduce((sum, game) => sum + game.points, 0) / recentGames.length;
  const avgUsage = recentGames.reduce((sum, game) => sum + game.usage, 0) / recentGames.length;
  const highScore = Math.max(...recentGames.map((game) => game.points));
  const steadyGames = recentGames.filter((game) => game.points >= player.floor).length;

  return {
    recentGames,
    seasonStats: {
      games: currentWeek - 1,
      avgPoints: Math.round((avgPoints * 0.65 + player.trueProjection * 0.35) * 10) / 10,
      avgUsage: Math.round(avgUsage),
      highScore: Math.round(highScore * 10) / 10,
      consistency: Math.round((steadyGames / recentGames.length) * 100),
    },
  };
}

interface GenerateSlateOptions {
  week?: number;
}

export function generateSlate(dateStr: string, options: GenerateSlateOptions = {}): Slate {
  const seed = dateSeed(dateStr);
  const rng = mulberry32(seed);
  const calendarSlateNumber = slateNumber(dateStr);
  const num = Number.isFinite(calendarSlateNumber) ? calendarSlateNumber : (seed % 10000);
  const week = options.week ?? (Math.floor(rng() * 17) + 1);

  // Pick modifier
  const modIdx = Math.floor(rng() * MODIFIERS.length);
  const modifier = MODIFIERS[modIdx];

  // Game script factors: one per game, drives correlated scoring
  const games: Game[] = GAME_PAIRS.map((pair, i) => {
    const factor = (rng() - 0.5) * 2; // -1 to +1
    return {
      id: `g${i}`,
      homeTeam: pair[0],
      awayTeam: pair[1],
      gameScriptFactor: factor,
    };
  });

  const gameByTeam: Record<string, Game> = {};
  games.forEach((g) => {
    gameByTeam[g.homeTeam] = g;
    gameByTeam[g.awayTeam] = g;
  });

  // Build opponent map
  const opponentMap: Record<string, string> = {};
  GAME_PAIRS.forEach(([a, b]) => {
    opponentMap[a] = b;
    opponentMap[b] = a;
  });

  const teamName = (id: string) => TEAMS.find((t) => t.id === id)?.name ?? id;

  // Per-slate form drift for each player
  const players: Player[] = PLAYER_TEMPLATES.map((tmpl) => {
    const formRoll = rng();
    const form: Player['form'] = formRoll < 0.15 ? 'hot' : formRoll < 0.30 ? 'cold' : 'normal';
    const formMult = form === 'hot' ? 1.08 : form === 'cold' ? 0.92 : 1.0;

    // Add noise to displayed projection (never reveal true)
    const noise = (rng() - 0.5) * 2.5;
    const trueProjection = tmpl.baseProjection * formMult;
    const displayedProjection = Math.max(1, trueProjection + noise);

    // Salary micro-variation
    const salaryVariation = Math.floor((rng() - 0.5) * 400 / 100) * 100;
    const salary = tmpl.baseSalary + salaryVariation;

    // Ownership variation
    const ownershipNoise = (rng() - 0.5) * 6;
    const ownership = Math.max(1, Math.min(70, tmpl.baseOwnership + ownershipNoise));

    const base: Player = {
      id: tmpl.id,
      name: tmpl.name,
      team: tmpl.team,
      opponent: opponentMap[tmpl.team] ?? '???',
      position: tmpl.position,
      archetype: tmpl.archetype,
      salary,
      trueProjection,
      displayedProjection: Math.round(displayedProjection * 10) / 10,
      floor: tmpl.baseFloor * (form === 'hot' ? 1.05 : form === 'cold' ? 0.92 : 1),
      ceiling: tmpl.baseCeiling * formMult,
      volatility: tmpl.baseVolatility,
      boomChance: tmpl.baseBoomChance,
      ownership: Math.round(ownership * 10) / 10,
      form,
      gameId: gameByTeam[tmpl.team]?.id ?? 'g0',
      recentGames: [],
      seasonStats: {
        games: 0,
        avgPoints: 0,
        avgUsage: 0,
        highScore: 0,
        consistency: 0,
      },
    };

    // Apply modifier
    const patch = modifier.apply(base);
    const modified = { ...base, ...patch };
    const history = generateRecentGames(modified, rng, week);
    return { ...modified, ...history };
  });

  // News events: pick 2 different players
  const newsEvents: NewsEvent[] = [];
  const usedPlayerIds = new Set<string>();

  for (let i = 0; i < 2; i++) {
    const candidates = players.filter(
      (p) => !usedPlayerIds.has(p.id) && p.position !== 'DST'
    );
    const idx = Math.floor(rng() * candidates.length);
    const target = candidates[idx];
    usedPlayerIds.add(target.id);

    const tmplIdx = Math.floor(rng() * NEWS_TEMPLATES.length);
    const tmpl = NEWS_TEMPLATES[tmplIdx];

    newsEvents.push({
      id: `news_${i}`,
      playerId: target.id,
      headline: tmpl.headline
        .replace('{name}', target.name)
        .replace('{team}', teamName(target.team)),
      detail: tmpl.detail.replace('{team}', teamName(target.team)),
      projectionDelta: tmpl.projectionDelta,
      ownershipDelta: tmpl.ownershipDelta,
      ceilingDelta: tmpl.ceilingDelta,
      triggerAtMinute: i === 0 ? 1 : 2,
    });
  }

  return { slateNumber: num, date: dateStr, seed, week, modifier, players, games, newsEvents };
}

export function applyNewsToPlayers(players: Player[], events: NewsEvent[]): Player[] {
  return players.map((p) => {
    const event = events.find((e) => e.playerId === p.id);
    if (!event) return p;
    return {
      ...p,
      displayedProjection: Math.max(0, p.displayedProjection + event.projectionDelta),
      trueProjection: Math.max(0, p.trueProjection + event.projectionDelta),
      ownership: Math.max(1, p.ownership + event.ownershipDelta),
      ceiling: Math.max(p.floor, p.ceiling + event.ceilingDelta),
    };
  });
}
