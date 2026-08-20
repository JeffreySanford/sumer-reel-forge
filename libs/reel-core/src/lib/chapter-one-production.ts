export interface ChapterOneProductionBeat {
  visual: string;
  motion: string;
}

export interface ChapterOneProductionDetail {
  captions: [string, string, string, string, string];
  beats: [
    ChapterOneProductionBeat,
    ChapterOneProductionBeat,
    ChapterOneProductionBeat,
    ChapterOneProductionBeat,
    ChapterOneProductionBeat,
    ChapterOneProductionBeat,
  ];
  styleAnchor: string;
  music: string;
  voice: string;
  socialTeaser: string;
}

export const CHAPTER_ONE_PRODUCTION_DETAILS: Record<
  number,
  ChapterOneProductionDetail
> = {
  2: {
    captions: [
      'The sea went still.',
      'A light moved below.',
      'Nammu named the work.',
      'Water. Shelter. Justice.',
      'Wandering became purpose.',
    ],
    beats: [
      {
        visual:
          'Enki alone at the oars as wind and waves suddenly fall silent before dawn.',
        motion: 'slow push toward the motionless oars',
      },
      {
        visual:
          'A pale blue current circles beneath the dark hull of the Stag of the Absu.',
        motion: 'overhead drift following the submerged light',
      },
      {
        visual:
          'Nammu suggested by a vast feminine profile formed only from water, stars, and current.',
        motion: 'subtle underwater rise and ripple',
      },
      {
        visual:
          'Enki listens while visions of a spring, a roadside shelter, and warm bread appear in mist.',
        motion: 'layered dissolve between promised works',
      },
      {
        visual:
          'Clay tablets, a balanced scale, and an open hand float symbolically above black water.',
        motion: 'gentle parallax across the symbols',
      },
      {
        visual:
          'First sunlight catches Enki at the helm, now steering directly toward Dilmun.',
        motion: 'wide pullback into a determined forward wake',
      },
    ],
    styleAnchor:
      'Enki in lapis-trimmed linen, Nammu represented through luminous water rather than a literal giant figure',
    music:
      'Begin with near-silence and low water resonance; introduce a single lyre phrase under Nammu and a steady frame-drum pulse at dawn.',
    voice:
      'Intimate and hushed at first, then firm and purposeful without becoming theatrical.',
    socialTeaser:
      'The mother of the first waters did not ask Enki to conquer. She gave him duties.',
  },
  3: {
    captions: [
      'What makes a civilization?',
      'Water for the thirsty.',
      'Bread for the hungry.',
      'Safety for the stranger.',
      'Mercy made into order.',
    ],
    beats: [
      {
        visual:
          'A dust-covered traveler crosses an empty salt road beneath a white midday sky.',
        motion: 'long lateral track beside the traveler',
      },
      {
        visual:
          'A clear spring bubbles into a carved stone basin beside reeds and shade cloth.',
        motion: 'macro push from dry dust into moving water',
      },
      {
        visual:
          'Hands pull round flatbread from a clay oven while a stranger waits at the threshold.',
        motion: 'warm handheld move from oven to offered bread',
      },
      {
        visual:
          'Attendants wash a traveler feet beside folded bedding in a modest roadside shrine.',
        motion: 'slow downward tilt to the basin and clean water',
      },
      {
        visual:
          'A strong guard lowers his spear as an elderly keeper opens the gate to a weary family.',
        motion: 'measured push through the opening gate',
      },
      {
        visual:
          'At twilight several travelers eat together under lamps while the road continues beyond them.',
        motion: 'wide orbit around the shared meal',
      },
    ],
    styleAnchor:
      'ordinary Bronze Age travelers and shrine keepers, humble clay architecture, water and bread as sacred civic symbols',
    music:
      'Dry wind and footsteps open the reel; hand drum, clay percussion, and soft lyre enter as water and bread appear.',
    voice:
      'Warm documentary cadence, emphasizing ordinary needs rather than divine spectacle.',
    socialTeaser:
      'Before walls and thrones, civilization could be measured by what happened to a thirsty stranger.',
  },
  4: {
    captions: [
      'Dilmun rose through the haze.',
      'Beautiful, but unfinished.',
      'Its future slept below.',
      'Could strangers become neighbors?',
      'The island was a question.',
    ],
    beats: [
      {
        visual:
          'A low island appears as a dark line through pearl-gray sea mist at sunrise.',
        motion: 'slow reveal as mist parts from the center',
      },
      {
        visual:
          'The boat passes reed beds alive with herons, fish, and wind-bent grasses.',
        motion: 'waterline tracking shot beside the reeds',
      },
      {
        visual:
          'Ninsikila stands at the bow in pale linen, studying distant tents and grazing animals.',
        motion: 'dolly from her profile toward the shore',
      },
      {
        visual:
          'A broad beautiful field breaks into dry cracked soil where fresh water should run.',
        motion: 'tilt from bright horizon down to the cracked earth',
      },
      {
        visual:
          'Enki kneels and presses a palm to the ground as if listening for hidden water.',
        motion: 'tight circular move around Enki and the soil',
      },
      {
        visual:
          'The Stag of the Absu approaches a narrow landing while island families gather in silhouette.',
        motion: 'slow forward glide with the boat wake',
      },
    ],
    styleAnchor:
      'Dilmun as a bright Persian Gulf island of reeds and low settlements, Ninsikila dignified in white and copper',
    music:
      'Open airy reed flute over water ambience, then add a low unresolved drone when the dry fields appear.',
    voice:
      'Wonder held in check by curiosity; allow the final question to remain open.',
    socialTeaser:
      'Dilmun looked like paradise from the sea. On land, one missing thing changed everything.',
  },
  5: {
    captions: [
      'No kings waited on shore.',
      'The Martu brought welcome.',
      'Milk. Meat. Fire. Laughter.',
      'Customs differed.',
      'Hospitality needed no translation.',
    ],
    beats: [
      {
        visual:
          'Martu herders watch the unfamiliar boat arrive from beside hide tents and long-horn cattle.',
        motion: 'slow pan from cattle bells to the shoreline',
      },
      {
        visual:
          'Ninsikila steps from the gangplank carrying woven cloth and a small copper vessel as gifts.',
        motion: 'low tracking move beside her careful first steps',
      },
      {
        visual:
          'A Martu matriarch offers a carved cup of milk while children peer from behind her robe.',
        motion: 'gentle push into the exchanged cup',
      },
      {
        visual:
          'Travelers and herders compare textiles, beads, tools, and gestures around a growing campfire.',
        motion: 'warm orbit around hands and exchanged objects',
      },
      {
        visual:
          'Enki observes two groups laughing despite speaking different languages.',
        motion: 'rack focus from Enki to the shared laughter',
      },
      {
        visual:
          'A wide night camp joins boat crew, Martu families, cattle, and fire beneath a clear sky.',
        motion: 'slow crane upward from fire to stars',
      },
    ],
    styleAnchor:
      'Martu represented as skilled pastoral families with practical wool and hide clothing, never as caricatures',
    music:
      'Cattle bells, hand claps, low drum, and plucked strings gradually combine into one welcoming rhythm.',
    voice:
      'Observant, humane, and lightly warm; keep the cultural meeting grounded.',
    socialTeaser:
      'Before they shared a language, Ninsikila and the Martu shared food, gifts, and a fire.',
  },
  6: {
    captions: [
      'Enki planned a grand arrival.',
      'The shore had other plans.',
      'Even a god can miss a step.',
      'Dilmun found its first joke.',
      'Humility opened the way.',
    ],
    beats: [
      {
        visual:
          'Enki straightens his lapis-trimmed robe at the boat rail while the shore crowd watches.',
        motion: 'formal slow push with deliberate symmetry',
      },
      {
        visual:
          'He places one sandaled foot onto a deceptively shallow patch of green water.',
        motion: 'tight tilt from dignified face to uncertain footing',
      },
      {
        visual:
          'Enki drops waist-deep into the shoreline with robe, beard, and arms thrown upward.',
        motion: 'quick downward snap followed by a held comic beat',
      },
      {
        visual:
          'The Martu stare for one silent breath before a child begins to laugh.',
        motion: 'slow sweep across restrained faces breaking into smiles',
      },
      {
        visual:
          'Ninsikila offers Enki a hand while openly laughing and he accepts with reluctant amusement.',
        motion: 'medium handheld move toward their joined hands',
      },
      {
        visual:
          'Enki walks ashore dripping beside laughing hosts as tension disappears from the gathering.',
        motion: 'relaxed tracking shot into the firelit camp',
      },
    ],
    styleAnchor:
      'gentle physical comedy with dignified characters, wet linen and muddy shallows rendered realistically',
    music:
      'Use restrained plucked strings and a brief percussion stumble, resolving into the Martu camp rhythm.',
    voice:
      'Dry, affectionate timing; pause before the laughter and avoid broad comedy delivery.',
    socialTeaser:
      'Enki meant to arrive as a god of wisdom. The Dilmun shoreline gave him a better introduction.',
  },
  7: {
    captions: [
      'The elder told of a snake.',
      'The city saw danger.',
      'The mountain saw a teacher.',
      'Land shapes wisdom.',
      'Dilmun needed many truths.',
    ],
    beats: [
      {
        visual:
          'A Martu elder begins a story beside a low night fire while Enki and Ninsikila listen.',
        motion: 'slow orbit inside the circle of listeners',
      },
      {
        visual:
          'In the story, a horned mountain ridge rises beneath moonlight and cold stars.',
        motion: 'dreamlike dissolve and upward reveal',
      },
      {
        visual:
          'A patterned desert snake crosses a narrow rock path ahead of a careful caravan.',
        motion: 'ground-level track following the snake path',
      },
      {
        visual:
          'A city traveler raises a staff in fear while a Martu guide calmly signals everyone to wait.',
        motion: 'rack focus between alarm and measured restraint',
      },
      {
        visual:
          'The snake disappears safely into stone and the caravan continues without violence.',
        motion: 'wide lateral follow as the path opens again',
      },
      {
        visual:
          'Back at the fire, Enki studies the elder with new respect as sparks rise into darkness.',
        motion: 'slow close-in ending on exchanged eye contact',
      },
    ],
    styleAnchor:
      'firelit oral storytelling intercut with a moonlit Martu mountain caravan, respectful natural history detail',
    music:
      'Sparse hand drum and breathy flute under the fire scene; use wind and stone resonance inside the mountain story.',
    voice:
      'Measured storyteller cadence with clear distinction between fear and patient observation.',
    socialTeaser:
      'The city called the snake a danger. The mountain people had learned to read its warning.',
  },
  8: {
    captions: [
      'Enki promised a perfect land.',
      'Ninsikila walked its fields.',
      'No sweet water answered.',
      'Beauty could not feed a city.',
      'The promise had to become useful.',
    ],
    beats: [
      {
        visual:
          'Enki presents sunlit Dilmun to Ninsikila from a high ridge above sea and marsh.',
        motion: 'majestic pullback revealing the island',
      },
      {
        visual:
          'Ninsikila walks through clean white courtyards and bright but empty garden channels.',
        motion: 'steady follow through the silent architecture',
      },
      {
        visual:
          'Farmers lift empty jars from a shallow well while dry grain bends around them.',
        motion: 'slow descent into the empty well mouth',
      },
      {
        visual:
          'A child tips the last drops from a clay cup as heat shimmers over the field.',
        motion: 'tight close-up with a slow heat-haze drift',
      },
      {
        visual:
          'Ninsikila kneels beside an unfilled canal and weeps without ceremony or attendants.',
        motion: 'still frame with only wind moving her veil',
      },
      {
        visual:
          'Enki stands behind her, looking from the dry channel toward the earth below.',
        motion: 'slow push past them toward the hidden ground',
      },
    ],
    styleAnchor:
      'Dilmun bright and mineral-white but visibly dry, Ninsikila as a practical queen concerned for ordinary households',
    music:
      'Begin with ceremonial lyre, strip it down to hot wind and a single low string as the empty wells are revealed.',
    voice:
      'Start with confidence, then turn quiet and concrete as the failed promise becomes visible.',
    socialTeaser:
      'Enki gave Ninsikila paradise. She showed him why a beautiful city without water was no gift.',
  },
  9: {
    captions: [
      'Enki listened below stone.',
      'The sweet water was hidden.',
      'Then the deep opened.',
      'Fields darkened with life.',
      'Dilmun found its heartbeat.',
    ],
    beats: [
      {
        visual:
          'Enki lies with one ear against dry earth while workers wait in a tense circle.',
        motion: 'slow overhead descent toward his listening hand',
      },
      {
        visual:
          'A cutaway vision descends through salt crust, stone layers, and a luminous underground aquifer.',
        motion: 'vertical journey downward through geological layers',
      },
      {
        visual:
          'Enki drives a copper-tipped staff into a marked point as the ground trembles.',
        motion: 'fast push to the impact followed by a held pause',
      },
      {
        visual:
          'Fresh water erupts in sunlight and rains over laughing workers and clay jars.',
        motion: 'slow-motion arc around the rising spring',
      },
      {
        visual:
          'New channels fill across fields as soil darkens and the first green shoots lift.',
        motion: 'time-lapse style glide along the moving water',
      },
      {
        visual:
          'Ninsikila and Enki stand beside a full pool reflecting the living island at sunset.',
        motion: 'wide crane from reflection to the renewed landscape',
      },
    ],
    styleAnchor:
      'fresh water as a physically grounded miracle, copper tools, clay channels, jubilant workers, no magical energy beams',
    music:
      'Deep pulse and stone resonance build toward the strike; water percussion, lyre, and full frame drum bloom with the spring.',
    voice:
      'Patient and tactile through the search, opening into restrained wonder when the water rises.',
    socialTeaser:
      'Dilmun did not need gold. Its future was waiting in the sweet water beneath the salt.',
  },
  10: {
    captions: [
      'A miracle is not a system.',
      'Enki and Nintu drew the land.',
      'Water needed a path.',
      'Abundance needed labor.',
      'The canal dream began.',
    ],
    beats: [
      {
        visual:
          'Enki and Nintu bend over a damp clay map inside a reed planning house.',
        motion: 'overhead push toward incised river lines',
      },
      {
        visual:
          'Nintu measures a shallow gradient with cord, pegs, and a water level in open country.',
        motion: 'lateral track following the taut measuring cord',
      },
      {
        visual:
          'Enki draws branching canal routes into clay while workers mark matching lines outside.',
        motion: 'match dissolve from clay groove to earth trench',
      },
      {
        visual:
          'Teams carry baskets of soil, shape banks, and reinforce crossings under hard sun.',
        motion: 'rhythmic montage of coordinated labor',
      },
      {
        visual:
          'The first controlled stream enters the new channel and rounds a carefully built turn.',
        motion: 'water-level tracking shot along the canal',
      },
      {
        visual:
          'At dusk a branching network shines across fields like veins seen from a high ridge.',
        motion: 'slow aerial-style pullback over the system',
      },
    ],
    styleAnchor:
      'practical Bronze Age surveying and canal engineering, Nintu as an expert collaborator, collective labor centered',
    music:
      'Measured clay percussion and work rhythm with plucked strings; let the water introduce the melodic resolution.',
    voice:
      'Clear, practical, and admiring of engineering detail rather than presenting effortless magic.',
    socialTeaser:
      'One spring was a miracle. Enki and Nintu wanted a system that could make abundance repeatable.',
  },
  11: {
    captions: [
      'The roads carried strangers.',
      'The shrines kept a promise.',
      'Drink. Eat. Wash. Rest.',
      'Power lived beyond palaces.',
      'Then continue safely.',
    ],
    beats: [
      {
        visual:
          'A lone traveler approaches a small reed-and-clay shrine beside a canal road at sunrise.',
        motion: 'long forward track from behind the traveler',
      },
      {
        visual:
          'A keeper fills a clean basin from a flowing channel and offers the first cup.',
        motion: 'close tracking move from water jar to hands',
      },
      {
        visual:
          'Round loaves bake against a clay oven wall while steam rises from a simple stew.',
        motion: 'warm macro montage of bread and shared food',
      },
      {
        visual:
          'Dusty feet are washed and a woven sleeping mat is unrolled beneath shade.',
        motion: 'gentle downward pan through the acts of care',
      },
      {
        visual:
          'A chain of distant road shrines glows at evening from Ur toward Sippar.',
        motion: 'wide landscape pan linking each lamp',
      },
      {
        visual:
          'The restored traveler leaves at dawn while another stranger arrives from the opposite road.',
        motion: 'balanced crossing movement through the shrine gate',
      },
    ],
    styleAnchor:
      'small functional public shrines, diverse travelers, clean water and warm bread, hospitality shown as infrastructure',
    music:
      'Footsteps and road wind settle into a gentle repeating lyre motif, with oven crackle and water carrying the rhythm.',
    voice:
      'Direct and compassionate, with short pauses on drink, eat, wash, and rest.',
    socialTeaser:
      'Enki put civilization along the road: water, bread, washing, and a safe place to sleep.',
  },
  12: {
    captions: [
      'Two brothers met at Nippur.',
      'One knew command.',
      'One knew water and craft.',
      'Neither gift was enough alone.',
      'Rule became stewardship.',
    ],
    beats: [
      {
        visual:
          'Nippur and the E.Kur rise through morning dust above canals and crowded approaches.',
        motion: 'slow architectural reveal from canal to temple',
      },
      {
        visual:
          'Enki enters a shaded council court where Enlil waits before a map of the land.',
        motion: 'formal tracking move between the two brothers',
      },
      {
        visual:
          'Enlil places a boundary cord on the map while Enki pours water through a carved channel.',
        motion: 'overhead orbit around their contrasting symbols',
      },
      {
        visual:
          'Visions of fields, roads, judges, workers, and families surround the council table.',
        motion: 'layered parallax through the responsibilities',
      },
      {
        visual:
          'The brothers clasp forearms over the map without bowing to one another.',
        motion: 'slow push into the equal gesture',
      },
      {
        visual:
          'A canal flows through Nippur as shepherds guide a flock across a stone bridge below E.Kur.',
        motion: 'wide pullback joining temple, canal, and flock',
      },
    ],
    styleAnchor:
      'Nippur as an active sacred city, Enlil austere in earth-toned robes, Enki in blue, brothers shown as complementary equals',
    music:
      'Low ceremonial drum and restrained horn tones resolve into interlocking lyre and water motifs.',
    voice:
      'Balanced and statesmanlike; avoid framing the meeting as a contest or triumph.',
    socialTeaser:
      'Enlil knew order. Enki knew flow. At Nippur, the brothers agreed that rule meant responsibility.',
  },
  13: {
    captions: [
      'The sky blackened at Kutu.',
      'Hail struck like stones.',
      'The canal touched death.',
      'Enki held the course.',
      'Small. Stubborn. Moving forward.',
    ],
    beats: [
      {
        visual:
          'Black storm clouds swallow the horizon above the narrow canal approach to Kutu.',
        motion: 'rapid cloud push over a low waterline view',
      },
      {
        visual:
          'Hail explodes across the deck while sailors pull ropes and shield their faces.',
        motion: 'shaking close montage driven by each impact',
      },
      {
        visual:
          'The Stag of the Absu pitches between steep dark banks toward an underworld gate marker.',
        motion: 'bow-mounted surge into the rising waves',
      },
      {
        visual:
          'Lightning freezes Enki at the helm, soaked but fixed on the channel ahead.',
        motion: 'staccato flashes alternating close and wide views',
      },
      {
        visual:
          'For one eerie moment the storm reveals still black water beyond the gate and no visible shore.',
        motion: 'slow unnatural glide into the silent opening',
      },
      {
        visual:
          'The boat emerges beneath a broken sky with dawn light cutting across the surviving crew.',
        motion: 'wide stabilizing pullback as the water calms',
      },
    ],
    styleAnchor:
      'dangerous ancient canal voyage, physical hail and waves, Kutu marked by austere stone and reed boundary symbols rather than fantasy ruins',
    music:
      'Heavy frame drum, bowed drone, hail impacts, and strained rope sounds; release to low water and one clear lyre note.',
    voice:
      'Controlled urgency with no shouted trailer delivery; let short final sentences carry the danger.',
    socialTeaser:
      'At Kutu, Enki sailed the canal where every city meets its oldest fear.',
  },
  14: {
    captions: [
      'Water reached the cities.',
      'Each place answered differently.',
      'Labor became memory.',
      'Memory became identity.',
      'Many worlds became connected.',
    ],
    beats: [
      {
        visual:
          'A new canal reaches the gate of Adab as residents gather with jars and work tools.',
        motion: 'water-level glide through the opening gate',
      },
      {
        visual:
          'Umma wakes around grain yards and irrigation channels under a distinct red dawn.',
        motion: 'wide pan across labor beginning for the day',
      },
      {
        visual:
          'Larsa appears through kiln smoke, temple walls, and bright water reflecting local banners.',
        motion: 'layered parallax through smoke, cloth, and canal',
      },
      {
        visual:
          'Lagash workers, scribes, fishers, and children fill a crowded quay with its own rhythm.',
        motion: 'flowing handheld passage through the quay',
      },
      {
        visual:
          'Four earth goddesses emerge symbolically from clay, grain, reeds, and city light, each visibly distinct.',
        motion: 'slow four-part dissolve linking place to spirit',
      },
      {
        visual:
          'From high above, separate city lights connect along one branching silver canal network.',
        motion: 'long pullback revealing connection without sameness',
      },
    ],
    styleAnchor:
      'Adab, Umma, Larsa, and Lagash differentiated through labor, architecture, color, and local earth goddess symbolism',
    music:
      'Introduce one short instrumental voice for each city, then weave them together over the shared water pulse.',
    voice:
      'Expansive but precise, stressing that connection does not erase local identity.',
    socialTeaser:
      'The canals did more than move water. They gave every city a way to become itself.',
  },
  15: {
    captions: [
      'Gardens stretched around Erech.',
      'Water became fruit.',
      'Fleece became thread.',
      'Skill became beauty.',
      'Civilization was daily work.',
    ],
    beats: [
      {
        visual:
          'Erech rises beyond miles of ordered gardens, orchards, and shining canals under hot sun.',
        motion: 'high sweeping reveal toward the city walls',
      },
      {
        visual:
          'Gardeners lift dates, figs, onions, and herbs into reed baskets beside flowing water.',
        motion: 'close rhythmic montage following hands and harvest',
      },
      {
        visual:
          'Shepherds wash pale fleece while spinners twist wool into even thread in the shade.',
        motion: 'match cuts from water to spindle rotation',
      },
      {
        visual:
          'Uttu oversees a broad loom where dyed threads form an intricate geometric cloth.',
        motion: 'slow lateral move across the growing pattern',
      },
      {
        visual:
          'Market lanes fill with fruit, folded textiles, clay jars, and workers trading the day output.',
        motion: 'steady walking shot through the dense market',
      },
      {
        visual:
          'At sunset families maintain canal banks and close garden gates before returning home.',
        motion: 'wide quiet pullback over the continuing work',
      },
    ],
    styleAnchor:
      'Erech as a productive garden city, Uttu associated with weaving craft, saturated produce and textiles balanced by dusty labor',
    music:
      'Bright plucked strings and loom-like hand percussion over canal ambience, settling into an evening work song rhythm.',
    voice:
      'Lively but grounded, honoring repeated skilled work more than luxury.',
    socialTeaser:
      'Enki brought water to Erech. Thousands of practiced hands turned it into a garden city.',
  },
  16: {
    captions: [
      'Eight sacred plants grew.',
      'Enki named them.',
      'Then consumed them.',
      'Knowledge without restraint became pain.',
      'Healing required humility.',
    ],
    beats: [
      {
        visual:
          'Eight distinct luminous but natural plants grow in a protected garden beside a clear channel.',
        motion: 'slow macro drift from leaf to leaf',
      },
      {
        visual:
          'Enki studies each root, seed, and stem while a scribe marks their names on clay.',
        motion: 'measured overhead move across plants and tablet',
      },
      {
        visual:
          'Curiosity turns careless as Enki tastes the plants one after another despite a keeper warning gesture.',
        motion: 'accelerating sequence of tight match cuts',
      },
      {
        visual:
          'Enki collapses in a dark chamber as symbolic lines of pain spread through jaw, rib, limbs, and breath.',
        motion: 'constricting circular move with dimming light',
      },
      {
        visual:
          'Ninhursag stands at the threshold in grief and anger, then turns away from the chamber.',
        motion: 'slow rack focus from Enki to her departure',
      },
      {
        visual:
          'Healing goddesses gather around Enki as dawn returns and fresh shoots rise outside.',
        motion: 'gentle upward reveal from hands to morning light',
      },
    ],
    styleAnchor:
      'sacred plants shown botanically and symbolically, illness non-graphic, Ninhursag authoritative, healing intimate rather than spectacular',
    music:
      'Delicate seed-rattle and lyre become dissonant after the plants are taken, then resolve through low voices and water.',
    voice:
      'Reflective and cautionary; keep the bodily suffering symbolic and suitable for public platforms.',
    socialTeaser:
      'Enki could name the sacred plants. Wisdom failed when he assumed naming gave him the right to take.',
  },
  17: {
    captions: [
      'Enki built a house for the deep.',
      'Silver held the light.',
      'Lapis held the water.',
      'Reeds and carp lived around it.',
      'The sacred entered daily life.',
    ],
    beats: [
      {
        visual:
          'Foundation workers drive timber and bundled reeds into wet ground at Eridu beside the Absu.',
        motion: 'low lateral move through coordinated construction',
      },
      {
        visual:
          'Artisans hammer silver fittings and set blue lapis into carved doors under shaded awnings.',
        motion: 'macro montage of tools, metal, and stone',
      },
      {
        visual:
          'The E-Absu rises above stepped water terraces, its pale walls reflected in moving pools.',
        motion: 'slow vertical reveal from reflection to roofline',
      },
      {
        visual:
          'Reed beds sway around the temple while carp flash below and birds settle near the water.',
        motion: 'waterline glide through living reeds',
      },
      {
        visual:
          'Enki enters the completed sanctuary carrying a simple overflowing vessel rather than a weapon.',
        motion: 'formal tracking move through the doorway',
      },
      {
        visual:
          'At blue hour the temple seems to float between its reflection and the first stars.',
        motion: 'wide still pullback as lamps appear',
      },
    ],
    styleAnchor:
      'E-Absu as sophisticated early Mesopotamian sacred architecture integrated with real wetlands, silver and lapis used as precise accents',
    music:
      'Construction rhythm of wood and metal opens into resonant lyre, water, reeds, and low choral texture at completion.',
    voice:
      'Reverent and tactile, naming materials clearly and avoiding inflated fantasy language.',
    socialTeaser:
      'The E-Absu did not stand apart from water and life. Enki built the deep into the city.',
  },
  18: {
    captions: [
      'Before cities, there was water.',
      'Before boundaries, relationship.',
      'Sky and earth took form.',
      'Land and sea moved apart.',
      'The voyage belonged to a larger beginning.',
    ],
    beats: [
      {
        visual:
          'A horizonless field of dark primordial water reflects stars before any land is visible.',
        motion: 'almost imperceptible forward drift over water',
      },
      {
        visual:
          'The presence of An appears as ordered constellations gathering across the upper darkness.',
        motion: 'slow upward tilt as stars find pattern',
      },
      {
        visual:
          'A first ridge of wet earth lifts from the sea while mist divides sky from water.',
        motion: 'time-lapse emergence through cloud and spray',
      },
      {
        visual:
          'Symbolic figures of sky, earth, and water separate while remaining linked by light and reflection.',
        motion: 'layered outward movement from one shared center',
      },
      {
        visual:
          'The divine family appears as distant human silhouettes around the newborn landscape, not giant idols.',
        motion: 'wide orbit around the family and first shore',
      },
      {
        visual:
          'Enki small in the Stag of the Absu crosses the same ancient water toward a sunlit world.',
        motion: 'long pullback connecting the boat to the cosmic horizon',
      },
    ],
    styleAnchor:
      'cosmic creation expressed through real water, earth, mist, stars, and restrained human symbolism rather than abstract effects',
    music:
      'Sub-bass water resonance, distant breath, and sparse bell tones grow into the established Enki lyre theme for the final image.',
    voice:
      'Spacious and reflective with deliberate pauses; end as a continuation rather than a conclusion.',
    socialTeaser:
      'Enki voyage began long after the first waters, but it still carried the pattern of creation.',
  },
};
