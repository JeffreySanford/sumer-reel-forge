export interface ReelShot {
  time: string;
  durationSeconds: number;
  visual: string;
  motion: string;
  prompt: string;
}

export interface TimedText {
  time: string;
  text: string;
}

export interface ReelEpisode {
  series: string;
  chapter: number;
  episode: number;
  title: string;
  targetDurationSeconds: number;
  sourceSection: string;
  hook: string;
  visualCore: string;
  logline: string;
  narration: string;
  onScreenText: TimedText[];
  shots: ReelShot[];
  musicDirection: string;
  voiceDirection: string;
  platformNotes: string[];
}

export interface ChapterReelSummary {
  episode: number;
  title: string;
  sourceSection: string;
  hook: string;
  visualCore: string;
}

export interface RenderJobRequest {
  episodeId: number;
  mode: 'storyboard' | 'draft-video' | 'final-video';
  voice?: string;
  notes?: string;
}

export interface RenderJob {
  id: string;
  episodeId: number;
  mode: RenderJobRequest['mode'];
  status: 'queued' | 'running' | 'complete' | 'failed';
  createdAt: string;
  notes?: string;
}

export const CHAPTER_ONE_SUMMARY: ChapterReelSummary[] = [
  {
    episode: 1,
    title: 'The Voyage Begins',
    sourceSection: 'The Voyage',
    hook: 'A god crosses the sea without knowing why.',
    visualCore: 'Stag of the Absu, coastline, Nammu beneath the waters',
  },
  {
    episode: 2,
    title: 'The Voice Beneath the Deep',
    sourceSection: 'The Voyage',
    hook: 'Nammu gives Enki his mission.',
    visualCore: 'Dark sea, glowing water, divine voice, tablets',
  },
  {
    episode: 3,
    title: 'Let No One Say I Am Thirsty',
    sourceSection: 'The Voyage',
    hook: 'Civilization begins with water, bread, and welcome.',
    visualCore: 'Springs, traveler shrines, ovens, bread',
  },
  {
    episode: 4,
    title: 'First Sight of Dilmun',
    sourceSection: 'The Voyage',
    hook: 'Enki sees the land that will become his world.',
    visualCore: 'Marshes, island, distant villages, livestock on boat',
  },
  {
    episode: 5,
    title: 'Meeting the Martu',
    sourceSection: 'Meeting the locals',
    hook: 'Ninsikila steps off the boat and meets the people of the land.',
    visualCore: 'Campfires, tents, gifts, cattle, laughter',
  },
  {
    episode: 6,
    title: 'The God Falls in the Sea',
    sourceSection: 'Meeting the locals',
    hook: 'Enki ruins his first impression in a deep shoreline.',
    visualCore: 'Comic beat, wet Enki, Martu laughter',
  },
  {
    episode: 7,
    title: 'The Snake on the Mountain',
    sourceSection: 'Meeting the locals',
    hook: 'Martu teaches Enki that every people has its own nature.',
    visualCore: 'Mountain warrior, snake, caravan, firelit faces',
  },
  {
    episode: 8,
    title: 'The Gift of Dilmun',
    sourceSection: 'A Well Deserved Rest / Enki and Ninhursag',
    hook: 'Enki gives Ninsikila a city, but the city has no water.',
    visualCore: 'Pristine island, dry fields, weeping queen',
  },
  {
    episode: 9,
    title: 'Sweet Water Rises',
    sourceSection: 'Enki and Ninhursag / Enki Returns',
    hook: 'Enki taps the deep waters and Dilmun becomes abundant.',
    visualCore: 'Aquifer, fountain, fresh pools, grain fields',
  },
  {
    episode: 10,
    title: 'The Canal Dream',
    sourceSection: 'Enki and the Kur',
    hook: 'Enki and Nintu redesign the land with canals.',
    visualCore: 'Maps, reed hut, river lines, workers',
  },
  {
    episode: 11,
    title: 'Shrines of the Road',
    sourceSection: 'Enki and the Kur',
    hook: 'Enki establishes food, water, washing, and rest for travelers.',
    visualCore: 'Ur, Sippar, ovens, basins, pilgrims',
  },
  {
    episode: 12,
    title: 'Brothers at Nippur',
    sourceSection: 'Enki and the Kur',
    hook: 'Enki and Enlil agree to become shepherds of the land.',
    visualCore: 'Nippur, E.Kur, council, canal through city',
  },
  {
    episode: 13,
    title: 'Storm at Kutu',
    sourceSection: 'Enki battles the Kur',
    hook: 'Enki sails into the storm guarding the realm of death.',
    visualCore: 'Hail, black sky, underworld canal, boat in waves',
  },
  {
    episode: 14,
    title: 'The Earth Goddesses',
    sourceSection: 'Birth of the Earth Goddesses',
    hook: 'Cities take on spirits as canals reach them.',
    visualCore: 'Adab, Umma, Larsa, Lagash, goddesses as city-spirits',
  },
  {
    episode: 15,
    title: 'Fifteen Miles of Gardens',
    sourceSection: 'Fifteen Miles in all Directions',
    hook: 'Erech becomes a garden city of wool, fruit, and canals.',
    visualCore: 'Uttu, orchards, looms, vegetables, hot sun',
  },
  {
    episode: 16,
    title: 'The Plants and the Curse',
    sourceSection: 'Enki gets sick / Ninhursag tells Enki',
    hook: 'Enki consumes the plants and suffers divine consequences.',
    visualCore: 'Eight plants, sickness, Ninhursag, healing births',
  },
  {
    episode: 17,
    title: 'House of the Absu',
    sourceSection: 'Enki builds the E-Absu / Journey to Nibru',
    hook: 'Enki raises the temple that floats on water.',
    visualCore: 'Silver, lapis, reed beds, carp, temple',
  },
  {
    episode: 18,
    title: 'Words of An',
    sourceSection: 'Words of An',
    hook: 'An remembers the first waters and his children.',
    visualCore: 'Cosmic waters, separation of land and sea, family of gods',
  },
];

export const REEL_ONE: ReelEpisode = {
  series: 'Blessings of Sumer',
  chapter: 1,
  episode: 1,
  title: 'The Voyage Begins',
  targetDurationSeconds: 60,
  sourceSection: 'The Voyage',
  hook: 'A god crosses the sea without knowing why.',
  visualCore: 'Stag of the Absu, coastline, Nammu beneath the waters',
  logline:
    'Enki sails the Stag of the Absu toward Dilmun and hears Nammu call him to build a world of water, bread, truth, justice, and freedom.',
  narration:
    'Before Sumer rose from the marsh, Enki sailed along the coast in a little boat called the Stag of the Absu. The sea stretched around him like the body of Nammu, his mother, endless and alive. He thought he was only wandering toward Dilmun, following a map his brother Enlil had given him. But from beneath the waves, a voice came to him. Establish water in this land. Build shrines for travelers. Let no one say, I am thirsty. Let no one say, I am hungry. Protect the fool and the wise alike. Carry truth, justice, and freedom into the world. As the shoreline drew near, Enki understood the voyage was not an escape. It was the beginning of civilization.',
  onScreenText: [
    { time: '00:00', text: 'Before Sumer...' },
    { time: '00:08', text: 'A boat crossed the Absu.' },
    { time: '00:20', text: 'Nammu spoke from the deep.' },
    { time: '00:36', text: 'Water. Bread. Truth. Justice. Freedom.' },
    { time: '00:54', text: 'The voyage became civilization.' },
  ],
  shots: [
    {
      time: '00:00-00:06',
      durationSeconds: 6,
      visual:
        'Black water before dawn, faint gold light on the horizon, ancient sea mist.',
      motion: 'slow push in',
      prompt:
        'cinematic ancient Mesopotamian myth, black sea before dawn, faint gold horizon, sacred atmosphere, realistic, vertical composition, no modern objects',
    },
    {
      time: '00:06-00:13',
      durationSeconds: 7,
      visual:
        'The Stag of the Absu sailing along a low coastline, reed bundles and livestock barely visible on deck.',
      motion: 'left to right pan',
      prompt:
        'ancient reed and wood sailing boat on Persian Gulf coastline, early Sumerian mythic setting, livestock silhouettes on deck, bronze age, cinematic realism, vertical 9:16',
    },
    {
      time: '00:13-00:20',
      durationSeconds: 7,
      visual:
        'Enki at the helm, hair and robe moving in sea wind, watching the shore to his right.',
      motion: 'slow dolly forward',
      prompt:
        'Enki at helm of ancient boat, wise Sumerian water god as human king, sea wind, coastline in distance, lapis and linen details, cinematic, vertical',
    },
    {
      time: '00:20-00:28',
      durationSeconds: 8,
      visual:
        'A vast feminine presence implied under the water, not literal, formed from light and currents.',
      motion: 'subtle ripple and zoom',
      prompt:
        'mythic ocean goddess presence suggested beneath dark blue water, luminous currents forming a gentle face-like impression, symbolic not literal, sacred, cinematic',
    },
    {
      time: '00:28-00:36',
      durationSeconds: 8,
      visual:
        'Traveler shrine imagined in the future: spring, oven, bread, strangers being welcomed.',
      motion: 'soft dissolve, slow push',
      prompt:
        'ancient Sumerian traveler shrine beside fresh spring, clay oven baking bread, strangers welcomed by attendants, warm firelight, reeds, early civilization',
    },
    {
      time: '00:36-00:44',
      durationSeconds: 8,
      visual:
        'Symbolic montage: water basin, bread, clay tablet, balanced scales, open road.',
      motion: 'gentle parallax',
      prompt:
        'symbolic Sumerian still life, fresh water basin, flatbread, clay tablet, simple balance scales, open desert road, truth justice freedom, cinematic lighting',
    },
    {
      time: '00:44-00:53',
      durationSeconds: 9,
      visual:
        "Dilmun's marshy island appearing through haze, reeds, birds, low sun.",
      motion: 'slow reveal upward',
      prompt:
        'Dilmun marsh island in ancient Mesopotamia, reeds, birds, low golden sun, fertile wetland emerging from haze, mythic realism, vertical frame',
    },
    {
      time: '00:53-01:00',
      durationSeconds: 7,
      visual: "Enki's boat approaching land; final title over water.",
      motion: 'slow push, fade to title',
      prompt:
        'ancient boat approaching marshland shore, Enki silhouette at helm, golden dawn, beginning of civilization, cinematic vertical poster frame',
    },
  ],
  musicDirection:
    'Low frame drum, soft lyre, water ambience, restrained cinematic rise near the end.',
  voiceDirection:
    'Calm mythic narrator, intimate but serious, not trailer-like.',
  platformNotes: [
    'Keep captions inside the center safe area.',
    'Avoid dense mythological names in the opening hook; introduce only Enki, Nammu, Enlil, and Dilmun.',
    'Use one consistent visual design for Enki and the Stag so later episodes feel connected.',
  ],
};

export const CHAPTER_ONE_REELS: ReelEpisode[] = [REEL_ONE];
