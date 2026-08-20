import { CHAPTER_ONE_PRODUCTION_DETAILS } from './chapter-one-production';

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
  exportMetadata: ReelExportMetadata;
  productionStatus: ReelProductionStatus;
}

export type ReelProductionStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'rendering'
  | 'published';

export interface UpdateReelStatusRequest {
  status: ReelProductionStatus;
  notes?: string;
}

export interface ReelExportMetadata {
  facebookCaption: string;
  xPost: string;
  tiktokCaption: string;
  youtubeShortsTitle: string;
  tags: string[];
}

export interface UpdateReelProductionRequest {
  logline: string;
  narration: string;
  onScreenText: TimedText[];
  shots: ReelShot[];
  musicDirection: string;
  voiceDirection: string;
  platformNotes: string[];
  exportMetadata: ReelExportMetadata;
}

export interface ChapterReelSummary {
  episode: number;
  title: string;
  sourceSection: string;
  hook: string;
  visualCore: string;
  productionStatus: ReelProductionStatus;
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
  startedAt?: string;
  finishedAt?: string;
  heartbeatAt?: string;
  workerId?: string;
  attemptCount: number;
  notes?: string;
}

export interface ClaimRenderJobRequest {
  workerId: string;
}

export interface GeneratedAssetManifest {
  id: string;
  renderJobId?: string;
  assetType: 'image' | 'audio' | 'captions' | 'video' | 'manifest' | 'other';
  shotNumber?: number;
  uri: string;
  contentUrl?: string;
  checksum?: string;
  metadata: Record<string, unknown>;
  reviewStatus: AssetReviewStatus;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

export type AssetReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CreateGeneratedAssetRequest {
  renderJobId?: string;
  assetType: GeneratedAssetManifest['assetType'];
  shotNumber?: number;
  uri: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateGeneratedAssetReviewRequest {
  status: AssetReviewStatus;
  notes?: string;
  reviewer?: string;
}

export interface RenderJobAttempt {
  id: string;
  renderJobId: string;
  attemptNumber: number;
  workerId: string;
  status: RenderJob['status'];
  startedAt: string;
  heartbeatAt?: string;
  finishedAt?: string;
  error?: string;
}

export type RenderLogLevel = 'info' | 'warn' | 'error';
export type RenderLogStream = 'stdout' | 'stderr' | 'system';

export interface RenderJobLog {
  id: string;
  renderJobId: string;
  workerId?: string;
  level: RenderLogLevel;
  stream: RenderLogStream;
  message: string;
  createdAt: string;
}

export interface CreateRenderJobLogRequest {
  workerId?: string;
  level: RenderLogLevel;
  stream: RenderLogStream;
  message: string;
}

const CHAPTER_ONE_SUMMARY_CONTENT: Omit<
  ChapterReelSummary,
  'productionStatus'
>[] = [
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

export const CHAPTER_ONE_SUMMARY: ChapterReelSummary[] =
  CHAPTER_ONE_SUMMARY_CONTENT.map((summary) => ({
    ...summary,
    productionStatus: 'draft',
  }));

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
  exportMetadata: {
    facebookCaption:
      'Before Sumer rose, Enki sailed toward Dilmun and heard the first command of civilization: water, bread, truth, justice, freedom.',
    xPost:
      'Enki sails the Stag of the Absu toward Dilmun. The voyage becomes civilization.',
    tiktokCaption:
      'A Sumerian creation journey begins on the dark water. #Sumer #Mythology #AncientHistory',
    youtubeShortsTitle: 'Before Sumer: Enki Sails Toward Dilmun',
    tags: ['Sumer', 'Enki', 'Dilmun', 'Mythology', 'Ancient History'],
  },
  productionStatus: 'draft',
};

const CHAPTER_ONE_REEL_COPY: Record<
  number,
  Pick<ReelEpisode, 'logline' | 'narration'>
> = {
  2: {
    logline:
      'Nammu rises through the dark water and names the work Enki must carry into Dilmun.',
    narration:
      'The sea grew quiet around Enki, and the oars seemed to pause in his hands. Beneath the Stag of the Absu, a light moved under the black water. It was Nammu, mother of the first waters, speaking from the deep. She did not offer him conquest. She gave him duties. Establish sweet water where the land is dry. Raise houses of rest along the roads. Feed the stranger. Protect the foolish from the strong and the wise from their pride. Enki listened as if the waves themselves had become law. By dawn, his wandering had become a command.',
  },
  3: {
    logline:
      'Enki imagines the first covenant of civilization: no traveler should be left thirsty, hungry, or unprotected.',
    narration:
      'Before there were walls, thrones, or tablets, Enki pictured a simpler measure of justice. A person walking the long road should find water. A hungry traveler should smell bread from an oven. A tired body should have a clean basin and a safe place to sleep. This was not glory. It was order made merciful. Nammu had told him that truth, justice, and freedom begin in ordinary needs. So Enki carried the idea toward Dilmun: a land where no one would have to say, I am thirsty, and no one would have to say, I am hungry.',
  },
  4: {
    logline:
      'Dilmun appears through mist as an island of promise, still waiting for the water that will complete it.',
    narration:
      'At last, Dilmun rose out of the haze. Reeds bent in the wind. Birds circled the marsh. The shoreline looked gentle, but Enki could feel what was missing. The land had beauty, animals, and open sky, yet its future slept beneath the ground. On the deck, Ninsikila watched the same coast with a different kind of wonder. This was not yet a city. It was a question. Could water be brought here? Could strangers become neighbors? Could a place at the edge of the sea become a home for gods and people alike?',
  },
  5: {
    logline:
      'Ninsikila meets the Martu and discovers hospitality before there are shared customs.',
    narration:
      'The first people waiting on the shore were not kings or priests. They were the Martu, people of tents, cattle, smoke, and open ground. Ninsikila stepped down from the boat with gifts in her hands. The Martu answered with milk, meat, and laughter around the fire. Their speech was strange to her, and her clothing was strange to them, but welcome needed no translation. Enki watched the meeting and understood that a land is not founded by command alone. It begins when people risk greeting one another before they fully understand each other.',
  },
  6: {
    logline:
      'Enki tries to step ashore with dignity and instead gives Dilmun its first shared joke.',
    narration:
      'Enki meant to arrive as a lord of wisdom. He lifted his robe, stepped from the boat, and sank straight into a hidden pocket of deep shoreline water. For one breath, everyone froze. Then the Martu laughed. Ninsikila laughed too, and at last Enki rose dripping from the sea with mud on his feet and salt in his beard. His first gift to Dilmun was not a law or a canal. It was humility. The people saw that even a god could misjudge the ground, and the day became warmer because of it.',
  },
  7: {
    logline:
      'A Martu story about a mountain snake teaches Enki that wisdom changes shape from people to people.',
    narration:
      'That night, a Martu elder told Enki of a snake on the mountain. In the city, people feared the snake as danger. In the high places, the Martu watched its movement and learned when to step aside, when to wait, and when to pass. Enki understood the lesson was not about snakes alone. Every people reads the world through the land that raised them. A canal builder, a herder, a sailor, and a queen may all know true things differently. If Dilmun was to live, it would need more than water. It would need room for many kinds of wisdom.',
  },
  8: {
    logline:
      'Enki gives Ninsikila Dilmun, only to learn that beauty without water cannot sustain a city.',
    narration:
      'Enki placed Dilmun before Ninsikila like a jewel. He promised her a land clean and bright, untouched by sorrow, sickness, or age. But as she walked its fields, the promise cracked. The soil waited dry. No sweet water ran through the gardens. No full wells answered the hands of the people. Ninsikila wept because she could see the city that should exist, and she could see why it did not. Enki had given her a kingdom of possibility. Now he had to give it the one thing every living place needs first.',
  },
  9: {
    logline:
      'Enki opens the deep aquifer and transforms Dilmun from symbol into living abundance.',
    narration:
      'Enki listened beneath the ground, past stone, salt, and silence, until he found the hidden sweet water. Then he struck the place where the deep should rise. A spring broke open. Pools filled. Channels shone in the sun. The dry fields darkened with life, and grain began to answer the wind. Ninsikila stood beside the new water and saw Dilmun change before her eyes. It was no longer only pure. It was useful. It could feed, wash, welcome, and endure. From the deep Absu, Enki had brought the city its heartbeat.',
  },
  10: {
    logline:
      'Enki and Nintu turn divine imagination into infrastructure by planning canals across the land.',
    narration:
      'In a reed house filled with heat and dust, Enki and Nintu bent over maps of clay. The land was not a blank space to dominate. It was a body with veins waiting to be opened. Here a canal. Here a basin. Here a crossing where workers could rest. Nintu saw the people who would carry baskets, shape banks, and plant fields. Enki saw the water finding its path. Together they dreamed in measurements, gradients, and labor. The miracle would not be a single spring. It would be a system that made abundance repeatable.',
  },
  11: {
    logline: `The road shrines turn Enki's command into a public network of food, washing, water, and rest.`,
    narration: `As the canals spread, Enki remembered Nammu's words about the traveler. Along the roads, shrines rose near water and shade. At one, a basin waited for dust-covered hands. At another, bread came warm from a clay oven. In Ur and Sippar, strangers learned that the land had made promises to people it had never met. The shrines were small, but their meaning was large. Power was not only in palaces. It was in the places where a lonely person could stop, drink, eat, wash, and continue safely.`,
  },
  12: {
    logline:
      'At Nippur, Enki and Enlil agree that rule must serve the land like shepherds serve a flock.',
    narration:
      'In Nippur, at the holy house of E.Kur, Enki met his brother Enlil. Between them lay the work of the land: canals, roads, fields, cities, and the lives now tied to them. Enlil knew command and order. Enki knew water and craft. Neither gift was enough alone. So the brothers spoke not as rivals, but as shepherds taking responsibility for a flock. The land would need boundaries and flow, judgment and mercy, strength and provision. Their agreement did not end every future conflict, but it gave civilization a shared center.',
  },
  13: {
    logline:
      'Enki enters the storm at Kutu, where the canal road touches the feared realm of death.',
    narration:
      'The sky blackened over Kutu. Hail struck the water like thrown stones, and the boat pitched toward the canal that guarded the land of the dead. Enki did not turn away. Some roads must be faced because every city lives beside mystery, loss, and fear. The storm roared like a gate refusing him passage. Enki held the course, not to conquer death, but to understand the boundary around life. Lightning showed the boat for a heartbeat at a time: small, stubborn, and moving forward through the dark.',
  },
  14: {
    logline:
      'As canals reach the cities, the land itself answers through the birth of local goddesses.',
    narration:
      'When water reached Adab, Umma, Larsa, and Lagash, the cities did not remain silent. Each place seemed to wake with its own spirit. The canals brought grain and trade, but they also brought identity. A city was more than walls. It was memory, labor, ritual, accent, and pride. In the story, these powers appeared as goddesses of the earth, each tied to a place that now had a voice. Enki saw that his work was multiplying beyond him. Water did not make one world. It made many worlds connected.',
  },
  15: {
    logline: `Erech becomes a garden city where Uttu's gifts of wool, fruit, and ordered growth flourish.`,
    narration: `Around Erech, the cultivated land stretched for miles in every direction. Orchards lifted fruit into the heat. Gardens crowded the canals. Wool moved from flock to spindle to loom under Uttu's care. This was abundance with discipline inside it. Every row of vegetables meant planning. Every woven cloth meant hands repeating skill until the work became beautiful. Enki had brought water, but people had turned water into livelihood. Erech stood as proof that civilization is not only founded once. It is remade each day by work.`,
  },
  16: {
    logline:
      'Enki eats the sacred plants and learns that knowledge taken without reverence can become sickness.',
    narration:
      'Eight plants grew where blessing had touched the land. Enki, curious and careless, consumed them one by one. The act looked small, but the cost entered his body. Pain found his jaw, his rib, his limbs, his breath. Ninhursag saw what he had done and withdrew her favor. Without her, the lord of sweet water began to fail. The lesson was sharp: not every living thing exists to be taken simply because it can be named. Healing would come, but only after Enki understood that wisdom without restraint turns against itself.',
  },
  17: {
    logline:
      'Enki builds the E-Absu, a temple of water, silver, lapis, reeds, and living abundance.',
    narration: `When Enki raised the E-Absu, he did not build a dry monument above the world. He built a house that remembered the deep. Silver flashed like running water. Lapis held the blue of hidden springs. Reeds moved around it, and carp stirred below. The temple seemed to float between earth and Absu, between craft and miracle. People could see in its walls the pattern of Enki's work: bring what is hidden into form, make beauty useful, and let the sacred flow through the daily life of the city.`,
  },
  18: {
    logline:
      'An speaks over the first waters and remembers the divine family born from separation, land, and sea.',
    narration: `At the end of the chapter, the voice of An reaches farther back than Dilmun, canals, or cities. He remembers the first waters before boundaries, before land had lifted from sea, before the children of the gods had taken their places. Creation was separation, but also relationship. Sky, earth, water, and life found their forms by moving apart and remaining connected. Enki's journey now belongs inside that older memory. The voyage to Dilmun was one chapter in a much larger beginning, where family, world, and civilization rose together.`,
  },
};

function buildReelEpisode(summary: ChapterReelSummary): ReelEpisode {
  const copy = CHAPTER_ONE_REEL_COPY[summary.episode];
  const production = CHAPTER_ONE_PRODUCTION_DETAILS[summary.episode];
  const times = [
    ['00:00-00:08', 8],
    ['00:08-00:18', 10],
    ['00:18-00:28', 10],
    ['00:28-00:39', 11],
    ['00:39-00:50', 11],
    ['00:50-01:00', 10],
  ] as const;

  return {
    series: 'Blessings of Sumer',
    chapter: 1,
    episode: summary.episode,
    title: summary.title,
    targetDurationSeconds: 60,
    sourceSection: summary.sourceSection,
    hook: summary.hook,
    visualCore: summary.visualCore,
    logline: copy.logline,
    narration: copy.narration,
    onScreenText: production.captions.map((text, index) => ({
      time: ['00:00', '00:12', '00:27', '00:42', '00:54'][index],
      text,
    })),
    shots: production.beats.map((beat, index) => ({
      time: times[index][0],
      durationSeconds: times[index][1],
      visual: beat.visual,
      motion: beat.motion,
      prompt: [
        'cinematic ancient Mesopotamian myth',
        beat.visual,
        production.styleAnchor,
        'Bronze Age material accuracy',
        'natural dramatic light',
        'realistic texture',
        'vertical 9:16 composition',
        'no written text',
        'no modern objects',
      ].join(', '),
    })),
    musicDirection: production.music,
    voiceDirection: production.voice,
    platformNotes: [
      'Target a self-contained 60 second cut with captions in the center safe area.',
      `Continuity anchor: ${production.styleAnchor}.`,
      'Avoid gore, modern objects, and dense exposition; privilege one emotional turn.',
    ],
    exportMetadata: {
      facebookCaption: `${summary.title}: ${production.socialTeaser}`,
      xPost: `${summary.title}: ${production.socialTeaser}`,
      tiktokCaption: `${production.socialTeaser} #Sumer #Mythology #Storytelling`,
      youtubeShortsTitle: `${summary.title} | Blessings of Sumer`,
      tags: ['Sumer', 'Mythology', 'Ancient History', summary.title],
    },
    productionStatus: summary.productionStatus,
  };
}

export const CHAPTER_ONE_REELS: ReelEpisode[] = [
  REEL_ONE,
  ...CHAPTER_ONE_SUMMARY.slice(1).map(buildReelEpisode),
];
