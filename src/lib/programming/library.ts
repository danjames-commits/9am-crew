import type { LevelText } from '../types';

// Every workout is done on your own. No partner workouts.
export type Style = 'amrap' | 'intervals' | 'long' | 'easy' | 'short';

export interface Conditioning {
  name: string;
  minutes: number;
  /** Gentle, Steady, Strong, Full */
  versions: LevelText;
  /** Same idea outside (running or walking instead of rowing or biking). */
  outdoor?: { name: string; versions: LevelText };
}

// Each style has several options; the builder rotates through them week to week
// and "Swap" steps to the next one.
export const CONDITIONING: Record<Style, Conditioning[]> = {
  short: [
    {
      name: 'Friday Grinder',
      minutes: 14,
      versions: [
        '2 rounds for time:\n20 wall balls (6 lb) to a high target\n15 kettlebell deadlifts (15 lb)\n10 step-backs',
        '3 rounds for time:\n20 wall balls (8 lb)\n15 kettlebell swings (18 lb)\n10 step-back burpees',
        '3 rounds for time:\n30 wall balls (10/14 lb)\n20 kettlebell swings (26/35 lb)\n10 burpees',
        '3 rounds for time:\n30 wall balls (14/20 lb)\n20 kettlebell swings (35/53 lb)\n15 burpees',
      ],
    },
    {
      name: 'Ten-Minute Ladder',
      minutes: 10,
      versions: [
        'As many rounds as you can in 10 min, adding 1 rep each round:\nbox step-ups + incline push-ups (on a box)',
        'As many rounds as you can in 10 min, adding 1 rep each round:\ngoblet squats (20 lb) + knee push-ups',
        'As many rounds as you can in 10 min, adding 1 rep each round:\nkettlebell swings (26/35 lb) + push-ups',
        'As many rounds as you can in 10 min, adding 1 rep each round:\nkettlebell swings (35/53 lb) + burpees',
      ],
    },
    {
      name: 'Sprint Sandwich',
      minutes: 12,
      versions: [
        'For time:\n6 min easy bike\n15 sit-to-stands from a box\n6 min easy bike',
        'For time:\n12 cal bike\n30 air squats\n12 cal bike',
        'For time:\n20 cal bike\n40 wall balls (10/14 lb)\n20 cal bike',
        'For time:\n30 cal bike\n50 wall balls (14/20 lb)\n30 cal bike',
      ],
      outdoor: {
        name: 'Run Sandwich',
        versions: [
          'For time:\n400 m brisk walk\n15 sit-to-stands from a box\n400 m brisk walk',
          'For time:\n400 m jog\n30 air squats\n400 m jog',
          'For time:\n600 m run\n40 wall balls (10/14 lb)\n600 m run',
          'For time:\n800 m run\n50 wall balls (14/20 lb)\n800 m run',
        ],
      },
    },
  ],
  intervals: [
    {
      name: 'Row Repeats',
      minutes: 18,
      versions: [
        '4 rounds: 150 m row at an easy-moderate pace, rest 2 min',
        '5 rounds: 250 m row, rest 2 min',
        '6 rounds: 250 m row hard, rest 1:30',
        '8 rounds: 250 m row hard, rest 1:15',
      ],
      outdoor: {
        name: 'Run Repeats',
        versions: [
          '4 rounds: 2 min brisk walk, then 2 min easy walk',
          '5 rounds: 200 m jog, walk back to recover',
          '6 rounds: 200 m run hard, walk back to recover',
          '8 rounds: 200 m run hard, jog back to recover',
        ],
      },
    },
    {
      name: 'On the Minute',
      minutes: 16,
      versions: [
        'Every minute for 12 min, rotating:\n1) 8 cal bike, easy\n2) 10 box sit-to-stands\n3) 20 s plank on a bench\n4) Rest',
        'Every minute for 16 min, rotating:\n1) 10 cal bike\n2) 12 goblet squats (15 lb)\n3) 30 s plank\n4) Rest',
        'Every minute for 16 min, rotating:\n1) 12 cal bike\n2) 15 kettlebell swings (26/35 lb)\n3) 10 push-ups\n4) Rest',
        'Every minute for 20 min, rotating:\n1) 15 cal bike\n2) 20 kettlebell swings (35/53 lb)\n3) 12 burpees\n4) Rest',
      ],
      outdoor: {
        name: 'On the Minute, Outside',
        versions: [
          'Every minute for 12 min, rotating:\n1) Brisk walk 100 m\n2) 10 box sit-to-stands\n3) 20 s plank on a bench\n4) Rest',
          'Every minute for 16 min, rotating:\n1) Jog 100 m\n2) 12 goblet squats (15 lb)\n3) 30 s plank\n4) Rest',
          'Every minute for 16 min, rotating:\n1) Run 150 m\n2) 15 kettlebell swings (26/35 lb)\n3) 10 push-ups\n4) Rest',
          'Every minute for 20 min, rotating:\n1) Run 200 m\n2) 20 kettlebell swings (35/53 lb)\n3) 12 burpees\n4) Rest',
        ],
      },
    },
    {
      name: '30 On, 30 Off',
      minutes: 15,
      versions: [
        '2 rounds of 30 s work, 30 s rest:\nbike · step-ups · wall push-ups · farmer carry (10 lb each hand) · rest',
        '3 rounds of 30 s work, 30 s rest:\nbike · goblet squats · knee push-ups · farmer carry (20 lb each hand) · rest',
        '3 rounds of 30 s work, 30 s rest:\nbike · kettlebell swings · push-ups · farmer carry (35 lb each hand) · rest',
        '3 rounds of 40 s work, 20 s rest:\nbike · kettlebell swings · burpees · farmer carry (53 lb each hand) · rest',
      ],
    },
  ],
  long: [
    {
      name: 'Steady 25',
      minutes: 25,
      versions: [
        '15 min at an easy pace, keep moving:\n8 cal bike · 8 step-ups · 8 ring rows (feet far back)',
        '20 min at a steady pace:\n10 cal bike · 10 step-ups · 10 ring rows',
        '25 min at a steady pace:\n12 cal bike · 12 box step-ups (20 in) · 10 ring rows',
        '25 min at a steady pace:\n15 cal bike · 15 box jumps or step-ups (24 in) · 12 ring rows',
      ],
      outdoor: {
        name: 'Loop and Station',
        versions: [
          '15 min, easy pace: walk a lap of the block (about 400 m), then 8 step-ups and 8 ring rows. Repeat.',
          '20 min, steady: brisk walk or jog 400 m, then 10 step-ups and 10 ring rows. Repeat.',
          '25 min, steady: run 400 m, then 12 box step-ups (20 in) and 10 ring rows. Repeat.',
          '25 min, steady: run 400 m, then 15 box jumps or step-ups (24 in) and 12 ring rows. Repeat.',
        ],
      },
    },
    {
      name: 'The Long Chipper',
      minutes: 25,
      versions: [
        'For time, 20 min cap:\n300 m row · 20 box sit-to-stands · 20 wall push-ups · 300 m row',
        'For time, 25 min cap:\n500 m row · 30 air squats · 20 knee push-ups · 500 m row',
        'For time, 25 min cap:\n750 m row · 40 wall balls (10/14 lb) · 30 push-ups · 750 m row',
        'For time, 25 min cap:\n1000 m row · 50 wall balls (14/20 lb) · 40 push-ups · 1000 m row',
      ],
      outdoor: {
        name: 'The Long Chipper, Outside',
        versions: [
          'For time, 20 min cap:\n400 m walk · 20 box sit-to-stands · 20 wall push-ups · 400 m walk',
          'For time, 25 min cap:\n600 m jog · 30 air squats · 20 knee push-ups · 600 m jog',
          'For time, 25 min cap:\n800 m run · 40 wall balls (10/14 lb) · 30 push-ups · 800 m run',
          'For time, 25 min cap:\n1200 m run · 50 wall balls (14/20 lb) · 40 push-ups · 1200 m run',
        ],
      },
    },
    {
      name: 'Bike and Carry',
      minutes: 24,
      versions: [
        '4 rounds, easy pace:\n3 min bike\n2 lengths farmer carry (10 lb each hand)',
        '5 rounds:\n3 min bike\n3 lengths farmer carry (20 lb each hand)',
        '6 rounds:\n3 min bike, steady\n4 lengths farmer carry (35 lb each hand)',
        '6 rounds:\n3 min bike, hard\n4 lengths farmer carry (53 lb each hand)',
      ],
    },
  ],
  amrap: [
    {
      name: 'Steady Twelve',
      minutes: 12,
      versions: [
        'As many rounds as you can in 12 min, easy pace:\n150 m row · 8 box sit-to-stands · 8 wall push-ups',
        'As many rounds as you can in 12 min:\n200 m row · 10 air squats · 8 knee push-ups',
        'As many rounds as you can in 12 min:\n250 m row · 15 kettlebell swings (26/35 lb) · 10 push-ups',
        'As many rounds as you can in 14 min:\n300 m row · 20 kettlebell swings (35/53 lb) · 15 push-ups',
      ],
      outdoor: {
        name: 'Steady Twelve, Outside',
        versions: [
          'As many rounds as you can in 12 min, easy pace:\n150 m brisk walk · 8 box sit-to-stands · 8 wall push-ups',
          'As many rounds as you can in 12 min:\n200 m jog · 10 air squats · 8 knee push-ups',
          'As many rounds as you can in 12 min:\n200 m run · 15 kettlebell swings (26/35 lb) · 10 push-ups',
          'As many rounds as you can in 14 min:\n300 m run · 20 kettlebell swings (35/53 lb) · 15 push-ups',
        ],
      },
    },
    {
      name: 'Three Fives',
      minutes: 17,
      versions: [
        '3 blocks of 5 min, rest 1 min between:\n6 step-ups · 6 incline push-ups · 30 s easy bike, repeat',
        '3 blocks of 5 min, rest 1 min between:\n8 goblet squats (15 lb) · 8 knee push-ups · 8 cal bike, repeat',
        '3 blocks of 5 min, rest 1 min between:\n10 goblet squats (26/35 lb) · 10 push-ups · 10 cal bike, repeat',
        '3 blocks of 5 min, rest 1 min between:\n12 goblet squats (35/53 lb) · 12 push-ups · 12 cal bike, repeat',
      ],
    },
    {
      name: 'Dumbbell Fifteen',
      minutes: 15,
      versions: [
        'As many rounds as you can in 15 min, easy pace:\n6 dumbbell deadlifts (light) · 6 dumbbell presses (light) · 6 step-ups',
        'As many rounds as you can in 15 min:\n8 dumbbell deadlifts (15 lb each) · 8 dumbbell presses · 8 step-ups',
        'As many rounds as you can in 15 min:\n10 dumbbell deadlifts (25/35 lb each) · 8 dumbbell push presses · 10 box step-ups',
        'As many rounds as you can in 15 min:\n12 dumbbell deadlifts (35/50 lb each) · 10 dumbbell push presses · 10 box jumps',
      ],
    },
  ],
  easy: [
    {
      name: 'Bike and Balance',
      minutes: 22,
      versions: [
        '3 rounds: 4 min easy bike · 10 heel raises · 20 s single-leg stand each side',
        '4 rounds: 4 min easy bike · 15 heel raises · 30 s single-leg stand each side',
        '4 rounds: 5 min easy bike · 20 heel raises · 10 slow step-downs each side',
        '5 rounds: 5 min easy bike · 20 single-leg heel raises · 10 slow step-downs each side',
      ],
      outdoor: {
        name: 'Walk and Talk',
        versions: [
          '20 min walk at a chatting pace, then 3 × 20 s single-leg stand each side',
          '25 min brisk walk, then 3 × 30 s single-leg stand each side',
          '25 min brisk walk carrying a light kettlebell for 1 min every 5 min',
          '30 min brisk walk or easy jog with a 35 lb carry for 1 min every 5 min',
        ],
      },
    },
    {
      name: 'Easy Flow',
      minutes: 20,
      versions: [
        '15 min easy bike, chatting pace',
        '20 min easy row or bike, chatting pace',
        '25 min easy row or bike, chatting pace',
        '30 min easy row or bike, chatting pace',
      ],
      outdoor: {
        name: 'Easy Flow, Outside',
        versions: [
          '15 min easy walk, chatting pace',
          '20 min brisk walk, chatting pace',
          '25 min brisk walk or easy jog',
          '30 min easy jog',
        ],
      },
    },
  ],
};
