/*
1e AD&D XP
Roll20 API script
Version 2.4.7
*/

var ADND1EXP = ADND1EXP || (function () {
  'use strict';

  var SCRIPT = '1e AD&D XP';
  var VERSION = '2.4.7';

  var THEME = {
    panelBg: '#000000',
    panelBorder: '#666666',
    text: '#ffffff',
    muted: '#bbbbbb',
    heading: '#ffffff',
    gold: '#ffd700',
    silver: '#c0c0c0',
    copper: '#cd7f32',
    electrum: '#d4c77d',
    platinum: '#e5ffff',
    magic: '#9fd6ff',
    monster: '#ff6666',
    good: '#8cff8c',
    warn: '#ffb366',
    bad: '#ff7f7f',
    buttonBg: '#222222',
    buttonBorder: '#777777',
    buttonText: '#ffffff',
    monsterBtnBg: '#550000',
    monsterBtnBorder: '#aa4444',
    coinBtnBg: '#5a4700',
    coinBtnBorder: '#b89400',
    magicBtnBg: '#0d355a',
    magicBtnBorder: '#4c98d9',
    hr: '#444444'
  };

  function esc(s) {
    s = String(s || '');
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    return s;
  }

  function toNum(v, d) {
    var n = parseFloat(v);
    return isNaN(n) ? d : n;
  }

  function toInt(v, d) {
    var n = parseInt(v, 10);
    return isNaN(n) ? d : n;
  }

  function parseArgs(content) {
    var parts = content.split(/\s+--/);
    var cmd = parts.shift().replace(/^\s+|\s+$/g, '');
    var args = {};
    var i, idx, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      idx = p.indexOf('|');
      if (idx === -1) continue;
      args[p.slice(0, idx).replace(/^\s+|\s+$/g, '').toLowerCase()] =
        p.slice(idx + 1).replace(/^\s+|\s+$/g, '');
    }
    return { cmd: cmd, args: args };
  }

  function gpFromCoins(cp, sp, ep, gp, pp) {
    return (toNum(cp, 0) / 200) + (toNum(sp, 0) / 20) + (toNum(ep, 0) / 2) + toNum(gp, 0) + (toNum(pp, 0) * 5);
  }

  function parseMaybeNumber(text) {
    text = String(text || '').replace(/,/g, '').replace(/^\s+|\s+$/g, '');
    if (/^\d+(\.\d+)?$/.test(text)) return parseFloat(text);
    return null;
  }

  function feeNet(amount, feePct, maxPct) {
    feePct = Math.max(0, Math.min(maxPct, toNum(feePct, 0)));
    return amount - (amount * (feePct / 100));
  }

  function moneyChangerNet(amountXp, feePct) {
    return feeNet(amountXp, feePct, 10);
  }

  function merchantNet(amountXp, feePct) {
    return feeNet(amountXp, feePct, 100);
  }

  function span(text, color, extra) {
    return '<span style="color:' + color + ';' + (extra || '') + '">' + esc(text) + '</span>';
  }

  function hr() {
    return '<div style="border-top:1px solid ' + THEME.hr + ';margin:6px 0;"></div>';
  }

  function panel(inner) {
    return '<div style="background:' + THEME.panelBg + ';color:' + THEME.text + ';border:1px solid ' + THEME.panelBorder + ';padding:8px;">' + inner + '</div>';
  }

  function h3(text) {
    return '<div style="font-size:20px;font-weight:bold;color:' + THEME.heading + ';margin:0 0 6px 0;">' + esc(text) + '</div>';
  }

  function h4(text) {
    return '<div style="font-size:16px;font-weight:bold;color:' + THEME.heading + ';margin:0 0 6px 0;">' + esc(text) + '</div>';
  }

  function btn(label, command, opts) {
    opts = opts || {};
    var bg = opts.bg || THEME.buttonBg;
    var border = opts.border || THEME.buttonBorder;
    var text = opts.text || THEME.buttonText;
    return '<a style="background:' + bg + ';color:' + text + ';padding:3px 6px;border:1px solid ' + border + ';text-decoration:none;display:inline-block;margin:1px;" href="' + command + '">' + esc(label) + '</a>';
  }

  function monsterBtn(label, command) {
    return btn(label, command, { bg: THEME.monsterBtnBg, border: THEME.monsterBtnBorder, text: THEME.buttonText });
  }

  function coinBtn(label, command) {
    return btn(label, command, { bg: THEME.coinBtnBg, border: THEME.coinBtnBorder, text: THEME.buttonText });
  }

  function magicBtn(label, command) {
    return btn(label, command, { bg: THEME.magicBtnBg, border: THEME.magicBtnBorder, text: THEME.buttonText });
  }

  function line(label, valueHtml) {
    return '<div><b>' + esc(label) + ':</b> ' + valueHtml + '</div>';
  }

  function coinSpan(label, type, amount) {
    var color = THEME.text;
    if (type === 'gp') color = THEME.gold;
    else if (type === 'sp') color = THEME.silver;
    else if (type === 'cp') color = THEME.copper;
    else if (type === 'ep') color = THEME.electrum;
    else if (type === 'pp') color = THEME.platinum;
    return span(label + ': ' + Math.floor(toNum(amount, 0)), color);
  }

  function send(html) {
    var prefix = getConfig().reportpublic ? '' : '/w gm ';
    sendChat(SCRIPT, prefix + html);
  }

  function selectedCharacterNames(msg) {
    var out = [];
    var seen = {};
    var i, sel, tok, cid, ch, name;

    if (!msg.selected || !msg.selected.length) return out;

    for (i = 0; i < msg.selected.length; i++) {
      sel = msg.selected[i];
      if (sel._type !== 'graphic') continue;
      tok = getObj('graphic', sel._id);
      if (!tok) continue;
      cid = tok.get('represents');
      if (!cid) continue;
      ch = getObj('character', cid);
      if (!ch) continue;
      name = ch.get('name');
      if (name && !seen[name]) {
        seen[name] = true;
        out.push(name);
      }
    }
    return out;
  }

  function findCharByName(name) {
    return findObjs({ type: 'character', name: name })[0] || null;
  }

  function getAttr(charId, attrName) {
    var a = findObjs({ type: 'attribute', characterid: charId, name: attrName })[0];
    return a ? a.get('current') : null;
  }

  function setOrCreateAttr(charId, attrName, value) {
    var a = findObjs({ type: 'attribute', characterid: charId, name: attrName })[0];
    if (a) a.set('current', value);
    else createObj('attribute', { characterid: charId, name: attrName, current: value });
  }

  function addToAttr(charId, attrName, amount) {
    var current = toNum(getAttr(charId, attrName), 0);
    setOrCreateAttr(charId, attrName, current + amount);
  }

  function checkState() {
    if (!state[SCRIPT]) state[SCRIPT] = {};

    if (!state[SCRIPT].config) {
      state[SCRIPT].config = { xpattr: 'xp', reportpublic: true };
    } else {
      if (!state[SCRIPT].config.xpattr) state[SCRIPT].config.xpattr = 'xp';
      if (typeof state[SCRIPT].config.reportpublic === 'undefined') state[SCRIPT].config.reportpublic = true;
    }

    if (!state[SCRIPT].recovered) state[SCRIPT].recovered = {};
    if (!state[SCRIPT].recovered.coins) state[SCRIPT].recovered.coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    if (!state[SCRIPT].recovered.gems) state[SCRIPT].recovered.gems = [];
    if (!state[SCRIPT].recovered.jewelry) state[SCRIPT].recovered.jewelry = [];
    if (!state[SCRIPT].recovered.magicItems) state[SCRIPT].recovered.magicItems = [];

    if (!state[SCRIPT].session) state[SCRIPT].session = {};
    if (typeof state[SCRIPT].session.monsterXP === 'undefined') state[SCRIPT].session.monsterXP = 0;
    if (typeof state[SCRIPT].session.turnedInCoinXP === 'undefined') state[SCRIPT].session.turnedInCoinXP = 0;
    if (typeof state[SCRIPT].session.turnedInTreasureXP === 'undefined') state[SCRIPT].session.turnedInTreasureXP = 0;
    if (typeof state[SCRIPT].session.turnedInMagicXP === 'undefined') state[SCRIPT].session.turnedInMagicXP = 0;
    if (typeof state[SCRIPT].session.potionXP === 'undefined') state[SCRIPT].session.potionXP = 0;
    if (typeof state[SCRIPT].session.soldItemXP === 'undefined') state[SCRIPT].session.soldItemXP = 0;
    if (!state[SCRIPT].session.manualXP) state[SCRIPT].session.manualXP = [];
    if (!state[SCRIPT].session.singleAwards) state[SCRIPT].session.singleAwards = {};
    if (!state[SCRIPT].session.party) state[SCRIPT].session.party = [];
    if (!state[SCRIPT].session.survivors) state[SCRIPT].session.survivors = [];
    if (!state[SCRIPT].session.henchmen) state[SCRIPT].session.henchmen = [];
    if (!state[SCRIPT].session.hirelings) state[SCRIPT].session.hirelings = [];
    if (!state[SCRIPT].session.monsterLog) state[SCRIPT].session.monsterLog = [];
    if (!state[SCRIPT].session.coinTurnInLog) state[SCRIPT].session.coinTurnInLog = [];
    if (!state[SCRIPT].session.magicSellLog) state[SCRIPT].session.magicSellLog = [];
  }

  function getConfig() { return state[SCRIPT].config; }
  function getRecovered() { return state[SCRIPT].recovered; }
  function getSession() { return state[SCRIPT].session; }

  function resetSession() {
    state[SCRIPT].session = {
      monsterXP: 0,
      turnedInCoinXP: 0,
      turnedInTreasureXP: 0,
      turnedInMagicXP: 0,
      potionXP: 0,
      soldItemXP: 0,
      manualXP: [],
      singleAwards: {},
      party: [],
      survivors: [],
      henchmen: [],
      hirelings: [],
      monsterLog: [],
      coinTurnInLog: [],
      magicSellLog: []
    };
    send(panel(span('Session XP reset. Recovered treasure was preserved.', THEME.good)));
    menu();
  }

  function resetCampaign() {
    state[SCRIPT] = {
      config: { xpattr: 'xp', reportpublic: true },
      recovered: {
        coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        gems: [],
        jewelry: [],
        magicItems: []
      },
      session: {
        monsterXP: 0,
        turnedInCoinXP: 0,
        turnedInTreasureXP: 0,
        turnedInMagicXP: 0,
        potionXP: 0,
        soldItemXP: 0,
        manualXP: [],
        singleAwards: {},
        party: [],
        survivors: [],
        henchmen: [],
        hirelings: [],
        monsterLog: [],
        coinTurnInLog: [],
        magicSellLog: []
      }
    };
    send(panel(span('Campaign reset complete. All session and recovered treasure data cleared.', THEME.good)));
    menu();
  }

  function recoveredListValue(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += toNum(list[i].value, 0);
    return total;
  }

  function recoveredCoinsGpValue() {
    var r = getRecovered();
    return gpFromCoins(r.coins.cp, r.coins.sp, r.coins.ep, r.coins.gp, r.coins.pp);
  }

  function totalSharedXP() {
    var s = getSession();
    var manual = 0, i;
    for (i = 0; i < s.manualXP.length; i++) manual += toNum(s.manualXP[i].xp, 0);
    return toNum(s.monsterXP, 0) +
      toNum(s.turnedInCoinXP, 0) +
      toNum(s.turnedInTreasureXP, 0) +
      toNum(s.turnedInMagicXP, 0) +
      toNum(s.potionXP, 0) +
      toNum(s.soldItemXP, 0) +
      manual;
  }

  var MONSTER_RAW = [
    "AERIAL SERVANT|16",
    "ANHKHEG|3-8",
    "ANT, Giant|2",
    "APE (Gorilla)|4 + 1",
    "APE, Carnivorous|5",
    "AXE BEAK|3",
    "BABOON|1 + 1",
    "BADGER|1 + 2",
    "BALUCHITHERIUM|14",
    "BARRACUDA|1-3",
    "BASILISK|6 + 1",
    "Black Bear|3 + 3",
    "Brown Bear|5 + 5",
    "Cave Bear|6 + 6",
    "BEAVER, Giant|4",
    "Bombardier Beetle|2 + 2",
    "Boring Beetle|5",
    "Fire Beetle|1 + 2",
    "Rhinoceros Beetle|12",
    "Stag Beetle|7",
    "Water Beetle|4",
    "BEHOLDER|45-75 hit points",
    "BLACK PUDDING|10",
    "BLINK DOG|4",
    "Boar, Wild|3 + 3",
    "Giant Boar|7",
    "Warthog|3",
    "BRAIN MOLE|1 hit point",
    "BROWNIE|1/2",
    "BUFFALO|5",
    "BUGBEAR|3 + 1",
    "BULETTE|9",
    "BULL|4",
    "CAMEL, Wild|3",
    "CARRION CRAWLER|3 + 1",
    "CATOBLEPAS|6 + 2",
    "CATTLE, Wild|1-4",
    "CENTAUR|4",
    "CENTIPEDE, Giant|1/4",
    "CEREBRAL PARASITE|n/a",
    "CHIMERA|9",
    "COCKATRICE|5",
    "COUATL|9",
    "CRAB, Giant|3",
    "CRAYFISH, Giant|4 + 4",
    "Crocodile|3",
    "Giant Crocodile|7",
    "Demogorgon (Prince of Demons)|200 hit points",
    "Juiblex (The Faceless Lord)|88 hit points",
    "Manes (Sub-Demon)|1",
    "Orcus (Prince of the Undead)|120 hit points",
    "Succubus|6",
    "Type I (Vrock)|8",
    "Type II (Hezrou)|9",
    "Type III (Glabrezu)|10",
    "Type IV (Nalfeshnee, etc.)|11",
    "Type V (Marilith, etc.)|7 + 7",
    "Type VI (Balor, etc.)|8 + 8",
    "Yeenoghu (Demon Lord of Gnolls)|100 hit points",
    "Asmodeus (Arch-devil)|199 hit points",
    "Baalzebul (Arch-devil)|166 hit points",
    "Barbed (Lesser devil)|8",
    "Bone (Lesser devil)|9",
    "Dispater (Arch-devil)|144 hit points",
    "Erinyes (Lesser devil)|6 + 6",
    "Geryon (Arch-devil)|133 hit points",
    "Horned (Malebranche) (Greater devil)|5 + 5",
    "Ice (Greater devil)|11",
    "Lemure|3",
    "Pit Fiend (Greater devil)|13",
    "Anatosaurus (Trachodon)|12",
    "Ankylosaurus|9",
    "Antrodemus (Allosaurus)|15",
    "Apatosaurus (Brontosaurus)|30",
    "Archelon Ischyros|7",
    "Brachiosaurus|36",
    "Camarasaurus|20",
    "Ceratosaurus|8",
    "Cetiosaurus|24",
    "Dinichthys|10",
    "Diplodocus|24",
    "Elasmosaurus|15",
    "Gorgosaurus|13",
    "Iguanadon|6",
    "Lambeosaurus|12",
    "Megalosaurus|12",
    "Monoclonius|8",
    "Mosasaurus|12",
    "Paleoscincus|9",
    "Pentaceratops|12",
    "Plateosaurus|8",
    "Plesiosaurus|20",
    "Pteranodon|3 + 3",
    "Stegosaurus|18",
    "Styracosaurus|10",
    "Teratosaurus|10",
    "Triceratops|16",
    "Tyrannosaurus Rex|18",
    "DISPLACER BEAST|6",
    "DJINNI|7 + 3",
    "War Dog|2 + 2",
    "Wild Dog|1 + 1",
    "DOLPHIN|2 + 2",
    "DOPPLEGANGER|4",
    "Black Dragon (Draco Causticus Sputem)|6-8",
    "Blue Dragon (Draco Electricus)|8-10",
    "Brass Dragon (Draco Impudentus Gallus)|6-8",
    "Bronze Dragon (Draco Gerus Bronzo)|8-10",
    "Chromatic Dragon (Tiamat)|16 (128 hit points)",
    "Copper Dragon (Draco Comes Stabuli)|7-9",
    "Platinum Dragon (Bahamut)|21 (168 hit points)",
    "Red Dragon (Draco Conflagratio Horriblis)|9-11",
    "Silver Dragon (Draco Nobilis Argentum)|9-11",
    "White Dragon (Draco Rigidus Frigidus)|5-7",
    "DRAGONNE|9",
    "DRAGON TURTLE|12-14",
    "DRYAD|2",
    "DWARF|7",
    "EAGLE, Giant|4",
    "EAR SEEKERS|1 hit point",
    "Electric Eel|2",
    "Giant Eel|5",
    "Weed Eel|1-1",
    "EFREETI|10",
    "Air Elemental|8, 12 or 16",
    "Earth Elemental|8, 12, or 16",
    "Fire Elemental|8, 12, or 16",
    "Water Elemental|8, 12, or 16",
    "Loxodont (Asiatic)|10",
    "Elephant (African)|11",
    "ELF|1 + 1",
    "ETTIN|10",
    "EYE, Floating|1-4 hit points",
    "EYE OF THE DEEP|10-12",
    "FLIGHTLESS BIRD|1-3",
    "Giant Frog|1-3",
    "Killer Frog|1 + 4",
    "Poisonous Frog|1",
    "FUNGI, Violet|3",
    "GAR, Giant|8",
    "GARGOYLE|4 + 4",
    "GAS SPORE|1 hit point",
    "GELATINOUS CUBE|4",
    "GHAST|4",
    "GHOST|10",
    "GHOUL|2",
    "Cloud Giant|12 + 2-7",
    "Fire Giant|11 + 2-5",
    "Frost Giant|10 + 1-4",
    "Hill Giant|8 + 1-2",
    "Stone Giant|9 + 1-3",
    "Storm Giant|15 + 2-7",
    "GNOLL|2",
    "GNOME|1",
    "GOAT, Giant|3 + 1",
    "GOBLIN|1-7 hit points",
    "Clay Golem|50 hit points",
    "Flesh Golem|40 hit points",
    "Iron Golem|80 hit points",
    "Stone Golem|60 hit points",
    "GORGON|8",
    "GRAY OOZE|3 + 3",
    "GREEN SLIME|2",
    "GRIFFON|7",
    "HALFLING|1-6 hit points",
    "GROANING SPIRIT (Banshee)|7",
    "HARPY|3",
    "HELL HOUND|4-7",
    "HERD ANIMAL|1-5",
    "HIPPOCAMPUS|4",
    "HIPPOGRIFF|3 + 3",
    "HIPPOPOTAMUS|8",
    "HOBGOBLIN|1 + 1",
    "HOMONCULOUS|2",
    "Draft Horse|3",
    "Heavy Horse|3 + 3",
    "Light Horse|2",
    "Medium Horse|2 + 2",
    "Pony|1 + 1",
    "Wild Horse|2",
    "HYDRA|5 to 12",
    "IMP|2 + 2",
    "Hyena|3",
    "Giant Hyena (Hyaenodon)|5",
    "INTELLECT DEVOURER|6 + 6",
    "INVISIBLE STALKER|8",
    "IRISH DEER|4",
    "IXITXACHITL|1 + 1",
    "JACKAL|1-4 hit points",
    "JACKALWERE|4",
    "JAGUAR|4 + 1",
    "KI-RIN|12",
    "KOBOLD|1-4 hit points",
    "LAMIA|9",
    "LAMMASU|7 + 7",
    "Lamprey|1 + 2",
    "Giant Lamprey|5",
    "LARVA|1",
    "LEECH, Giant|1-4",
    "LEOPARD|3 + 2",
    "LEPRECHAUN|2-5 hit points",
    "LEUCROTTA|6 + 1",
    "LICH|11+",
    "Lion|5 + 2",
    "Mountain Lion|3 + 1",
    "Spotted Lion|6 + 2",
    "Fire Lizard|10",
    "Giant Lizard|3 + 1",
    "Minotaur Lizard|8",
    "Subterranean Lizard|6",
    "LIZARD MAN|2 + 1",
    "LOCATHAH|2",
    "LURKER ABOVE|10",
    "Werebear|7 + 3",
    "Wereboar|5 + 2",
    "Wererat|3 + 1",
    "Weretiger|6 + 2",
    "Werewolf|4 + 3",
    "LYNX, Giant|2 + 2",
    "MAMMOTH|13",
    "MANTICORE|6 + 3",
    "MASTODON|12",
    "MEDUSA|6",
    "Bandit (Brigand)|1-6 hit points",
    "Berserker|2-7 hit points",
    "Buccaneer (Pirate)|1-6 hit points",
    "Caveman (Tribesman)|2 (1)",
    "Dervish (Nomad)|1-6 hit points",
    "Merchant|1-6 hit points",
    "Pilgrim|1-6 hit points",
    "MERMAN|1 + 1",
    "MIMIC|7-10",
    "MIND FLAYER|8 + 4",
    "MINOTAUR|6 + 3",
    "Brown Mold|—",
    "Yellow Mold|—",
    "MORKOTH|7",
    "MULE|3",
    "MUMMY|6 + 3",
    "Guardian Naga|11-12",
    "Spirit Naga|9-10",
    "Water Naga|7-8",
    "NEO-OTYUGH|9-12",
    "NIGHT HAG|8",
    "NIGHTMARE|6 + 6",
    "NIXIE|1-4 hit points",
    "NYMPH|3",
    "OCHRE JELLY|6",
    "OCTOPUS, Giant|8",
    "OGRE|4 + 1",
    "OGRE MAGE (Japanese Ogre)|5 + 2",
    "ORC|1",
    "OTTER, Giant|5",
    "OTYUGH|6-8",
    "OWL, Giant|4",
    "OWLBEAR|5 + 2",
    "PEGASUS|4",
    "PERYTON|4",
    "PIERCER|1-4",
    "PIKE, Giant|4",
    "PIXIE|1-4 hit points",
    "PORCUPINE, Giant|6",
    "PORTUGUESE MAN-O-WAR, Giant|1-4",
    "PSEUDO-DRAGON|2",
    "PURPLE WORM|15",
    "QUASIT|3",
    "RAKSHASA|7",
    "RAM, Giant|4",
    "RAT, Giant (Sumatran)|1-4 Hit points",
    "Manta Ray|8-11",
    "Pungi Ray|4",
    "Sting Ray|1",
    "REMORHAZ|7-14",
    "Rhinoceros|8-9",
    "Woolly Rhinoceros|10",
    "ROC|18",
    "ROPER|10-12",
    "ROT GRUB|1 hit point",
    "RUST MONSTER|5",
    "SAHUAGIN|2 + 2",
    "SALAMANDER|7 + 7",
    "SATYR|5",
    "SCORPION, Giant|5 + 5",
    "SEA HAG|3",
    "SEA HORSE, Giant|2-4",
    "SEA LION|6",
    "SHADOW|3 + 3",
    "SHAMBLING MOUND|8-11",
    "Shark|3-8",
    "Giant Shark (Megalodon)|10-15",
    "SHEDU|9 + 9",
    "SHRIEKER|3",
    "SKELETON|1",
    "SKUNK, Giant|5",
    "SLITHERING TRACKER|5",
    "SLUG, Giant|12",
    "Amphisbaena|6",
    "Constrictor Snake|6 + 1",
    "Poisonous Snake|4 + 2",
    "Sea Snake|8-10",
    "Spitting Snake|4 + 2",
    "SPECTRE|7 + 3",
    "Andro-Sphinx|12",
    "Crio-Sphinx|10",
    "Gyno-Sphinx|8",
    "Hieraco-Sphinx|9",
    "Giant Spider|4 + 4",
    "Huge Spider|2 + 2",
    "Large Spider|1 + 1",
    "Phase Spider|5 + 5",
    "Water Giant Spider|3 + 3",
    "SPRITE|1",
    "SQUID, Giant|12",
    "Stag|3",
    "Giant Stag|5",
    "STIRGE|1 + 1",
    "STRANGLE WEED|2-4",
    "SU-MONSTER|5 + 5",
    "SYLPH|3",
    "THOUGHT EATER|3",
    "TICK, Giant|2-4",
    "Tiger|5 + 5",
    "Sabre-Tooth Tiger (Smilodon)|7 + 2",
    "TITAN|17-22",
    "TITANOTHERE|12",
    "Giant Toad|2 + 4",
    "Ice Toad|5",
    "Poisonous Toad|2",
    "TRAPPER|12",
    "TREANT|7-12",
    "TRITON|3",
    "TROGLODYTE|2",
    "TROLL|6 + 6",
    "Giant Sea Turtle|15",
    "Giant Snapping Turtle|10",
    "UMBER HULK|8 + 8",
    "UNICORN|4 + 4",
    "VAMPIRE|8 + 3",
    "WASP, Giant|4",
    "WATER WEIRD|3 + 3",
    "WEASEL, Giant|3 + 3",
    "WHALE|12 to 36",
    "WIGHT|4 + 3",
    "WILL-O-(THE)-WISP|9",
    "WIND WALKER|6 + 3",
    "Wolf|2 + 2",
    "Dire Wolf (Worg)|3 + 3 (4 + 4)",
    "Winter Wolf|6",
    "Wolverine|3",
    "Giant Wolverine|4 + 4",
    "WRAITH|5 + 3",
    "XORN|7 + 7",
    "YETI|4 + 4",
    "ZOMBIE|2"
  ];

  function buildMonsterDb(raw) {
    var out = [];
    var i, parts;
    for (i = 0; i < raw.length; i++) {
      parts = raw[i].split('|');
      if (parts.length >= 2) out.push({ name: parts[0], hd: parts[1] });
    }
    return out;
  }

  var MONSTER_DB = buildMonsterDb(MONSTER_RAW);

  function monsterListByLetter(letter) {
    var out = [];
    var i, m;
    letter = String(letter || '').toUpperCase();
    for (i = 0; i < MONSTER_DB.length; i++) {
      m = MONSTER_DB[i];
      if (String(m.name).charAt(0).toUpperCase() === letter) out.push(m);
    }
    out.sort(function (a, b) {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });
    return out;
  }

  var MAGIC_RAW = [
    "Potions|Animal Control|250|400",
    "Potions|Clairaudience|250|400",
    "Potions|Clairvoyance|300|500",
    "Potions|Climbing|300|500",
    "Potions|Delusion|---|150",
    "Potions|Diminution|300|500",
    "Potions|Dragon Control|500–1,000|5,000–9,000",
    "Potions|ESP|500|850",
    "Potions|Extra-Healing|400|800",
    "Potions|Fire Resistance|250|400",
    "Potions|Flying|500|750",
    "Potions|Gaseous Form|300|400",
    "Potions|Giant Control|400–900|1,000–6,000",
    "Potions|Giant Strength (F)|500–750|900–1,400",
    "Potions|Growth|250|300",
    "Potions|Healing|200|400",
    "Potions|Heroism (F)|300|500",
    "Potions|Human Control|500|900",
    "Potions|Invisibility|250|500",
    "Potions|Invulnerability (F)|350|500",
    "Potions|Levitation|250|400",
    "Potions|Longevity|500|1,000",
    "Potions|Oil of Etherealness|600|1,500",
    "Potions|Oil of Slipperiness|400|750",
    "Potions|Philter of Love|200|300",
    "Potions|Philter of Persuasiveness|400|850",
    "Potions|Plant Control|250|300",
    "Potions|Polymorph (self)|200|350",
    "Potions|Poison|---|---",
    "Potions|Speed|200|450",
    "Potions|Super-Heroism (F)|450|750",
    "Potions|Sweet Water|200|250",
    "Potions|Treasure Finding|600|2,000",
    "Potions|Undead Control|700|2,500",
    "Potions|Water Breathing|400|900",

    "Scrolls|Scroll spells|100 XP per spell level|3 × XP",
    "Scrolls|Protection — Demons|2,500|12,500",
    "Scrolls|Protection — Devils|2,500|12,500",
    "Scrolls|Protection — Elementals|1,500|7,500",
    "Scrolls|Protection — Lycanthropes|1,000|5,000",
    "Scrolls|Protection — Magic|1,500|7,500",
    "Scrolls|Protection — Petrification|2,000|10,000",
    "Scrolls|Protection — Possession|2,000|10,000",
    "Scrolls|Protection — Undead|1,500|7,500",
    "Scrolls|Curse|---|---",

    "Rings|Contrariness|---|1,000",
    "Rings|Delusion|---|2,000",
    "Rings|Djinni Summoning|3,000|20,000",
    "Rings|Elemental Command|5,000|25,000",
    "Rings|Feather Falling|1,000|5,000",
    "Rings|Fire Resistance|1,000|5,000",
    "Rings|Free Action|1,000|5,000",
    "Rings|Human Influence|2,000|10,000",
    "Rings|Invisibility|1,500|7,500",
    "Rings|Mammal Control|1,000|5,000",
    "Rings|Multiple Wishes|5,000|25,000",
    "Rings|Protection|2,000–4,000|10,000–20,000",
    "Rings|Regeneration|5,000|40,000",
    "Rings|Shooting Stars|3,000|15,000",
    "Rings|Spell Storing|2,500|22,500",
    "Rings|Spell Turning|2,000|17,500",
    "Rings|Swimming|1,000|5,000",
    "Rings|Telekinesis|2,000|10,000",
    "Rings|Three Wishes|3,000|15,000",
    "Rings|Warmth|1,000|5,000",
    "Rings|Water Walking|1,000|5,000",
    "Rings|Weakness|---|1,000",
    "Rings|Wizardry (M)|4,000|50,000",
    "Rings|X-Ray Vision|4,000|35,000",

    "Rods, Staves, and Wands|Rod of Absorption|7,500|40,000",
    "Rods, Staves, and Wands|Rod of Beguiling|5,000|30,000",
    "Rods, Staves, and Wands|Rod of Cancellation|10,000|15,000",
    "Rods, Staves, and Wands|Rod of Lordly Might|6,000|20,000",
    "Rods, Staves, and Wands|Rod of Resurrection|10,000|35,000",
    "Rods, Staves, and Wands|Rod of Rulership|8,000|35,000",
    "Rods, Staves, and Wands|Rod of Smiting|4,000|15,000",
    "Rods, Staves, and Wands|Staff of Command|5,000|25,000",
    "Rods, Staves, and Wands|Staff of Curing|6,000|25,000",
    "Rods, Staves, and Wands|Staff of the Magi|15,000|75,000",
    "Rods, Staves, and Wands|Staff of Power|12,000|60,000",
    "Rods, Staves, and Wands|Staff of the Serpent|7,000|35,000",
    "Rods, Staves, and Wands|Staff of Striking|6,000|15,000",
    "Rods, Staves, and Wands|Staff of Withering|8,000|35,000",
    "Rods, Staves, and Wands|Wand of Conjuration|7,000|35,000",
    "Rods, Staves, and Wands|Wand of Enemy Detection|2,000|10,000",
    "Rods, Staves, and Wands|Wand of Fear|3,000|15,000",
    "Rods, Staves, and Wands|Wand of Fire|4,500|25,000",
    "Rods, Staves, and Wands|Wand of Frost|6,000|50,000",
    "Rods, Staves, and Wands|Wand of Illumination|2,000|10,000",
    "Rods, Staves, and Wands|Wand of Illusion|3,000|20,000",
    "Rods, Staves, and Wands|Wand of Lightning|4,000|30,000",
    "Rods, Staves, and Wands|Wand of Magic Detection|2,500|25,000",
    "Rods, Staves, and Wands|Wand of Metal & Mineral Detection|1,500|7,500",
    "Rods, Staves, and Wands|Wand of Magic Missiles|4,000|35,000",
    "Rods, Staves, and Wands|Wand of Negation|3,500|15,000",
    "Rods, Staves, and Wands|Wand of Paralyzation|3,500|25,000",
    "Rods, Staves, and Wands|Wand of Polymorphing|3,500|25,000",
    "Rods, Staves, and Wands|Wand of Secret Door & Trap Location|5,000|40,000",
    "Rods, Staves, and Wands|Wand of Wonder|6,000|10,000",

    "Misc|Alchemy Jug|3,000|12,000",
    "Misc|Amulet of Inescapable Location|---|1,000",
    "Misc|Amulet of Life Protection|5,000|20,000",
    "Misc|Amulet of the Planes|6,000|30,000",
    "Misc|Amulet of Proof Against Detection and Location|4,000|15,000",
    "Misc|Apparatus of Kwalish|8,000|35,000",
    "Misc|Arrow of Direction|2,500|17,500",
    "Misc|Artifact or Relic|---|---",
    "Misc|Bag of Beans|1,000|5,000",
    "Misc|Bag of Devouring|---|1,500",
    "Misc|Bag of Holding|5,000|25,000",
    "Misc|Bag of Transmuting|---|500",
    "Misc|Bag of Tricks|2,500|15,000",
    "Misc|Beaker of Plentiful Potions|1,500|12,500",
    "Misc|Boat, Folding|10,000|25,000",
    "Misc|Book of Exalted Deeds (C)|8,000|40,000",
    "Misc|Book of Infinite Spells|9,000|50,000",
    "Misc|Book of Vile Darkness (C)|8,000|40,000",
    "Misc|Boots of Dancing|---|5,000",
    "Misc|Boots of Elvenkind|1,000|5,000",
    "Misc|Boots of Levitation|2,000|15,000",
    "Misc|Boots of Speed|2,500|20,000",
    "Misc|Boots of Striding and Springing|2,500|20,000",
    "Misc|Bowl Commanding Water Elementals (M)|4,000|25,000",
    "Misc|Bowl of Watery Death (M)|---|1,000",
    "Misc|Bracers of Defense|500*|3,000*",
    "Misc|Bracers of Defenselessness|---|2,000",
    "Misc|Brazier Commanding Fire Elementals (M)|4,000|25,000",
    "Misc|Brazier of Sleep Smoke (M)|---|1,000",
    "Misc|Brooch of Shielding|1,000|10,000",
    "Misc|Broom of Animated Attack|---|3,000",
    "Misc|Broom of Flying|2,000|10,000",
    "Misc|Bucknard’s Everfull Purse|1,500 / 2,500 / 4,000|15,000 / 25,000 / 40,000",

    "Misc|Candle of Invocation (C)|1,000|5,000",
    "Misc|Carpet of Flying|7,500|25,000",
    "Misc|Censer Controlling Air Elementals (M)|4,000|25,000",
    "Misc|Censer of Summoning Hostile Air Elementals (M)|---|1,000",
    "Misc|Chime of Opening|3,500|20,000",
    "Misc|Chime of Hunger|---|---",
    "Misc|Cloak of Displacement|3,000|17,500",
    "Misc|Cloak of Elvenkind|1,000|6,000",
    "Misc|Cloak of Manta Ray|2,000|12,500",
    "Misc|Cloak of Poisonousness|---|2,500",
    "Misc|Cloak of Protection|1,000*|10,000*",
    "Misc|Crystal Ball (M)|1,000**|5,000**",
    "Misc|Crystal Hypnosis Ball (M)|---|3,000",
    "Misc|Cube of Force|3,000|20,000",
    "Misc|Cube of Frost Resistance|2,000|14,000",
    "Misc|Cubic Gate|5,000|17,500",
    "Misc|Daern’s Instant Fortress|7,000|27,500",
    "Misc|Decanter of Endless Water|1,000|3,000",
    "Misc|Deck of Many Things|---|10,000",
    "Misc|Drums of Deafening|---|500",
    "Misc|Drums of Panic|6,500|35,000",
    "Misc|Dust of Appearance|1,000|4,000",
    "Misc|Dust of Disappearance|2,000|8,000",
    "Misc|Dust of Sneezing and Choking|---|1,000",
    "Misc|Efreeti Bottle|9,000|45,000",
    "Misc|Eversmoking Bottle|500|2,500",
    "Misc|Eyes of Charming (M)|4,000|24,000",
    "Misc|Eyes of the Eagle|3,500|18,000",
    "Misc|Eyes of Minute Seeing|2,000|12,500",
    "Misc|Eyes of Petrification|---***|---***",

    "Misc|Figurine of Wondrous Power|100*|1,000*",
    "Misc|Flask of Curses|---|1,000",
    "Misc|Gauntlets of Dexterity|1,000|10,000",
    "Misc|Gauntlets of Fumbling|---|1,000",
    "Misc|Gauntlets of Ogre Power (C, F, T)|1,000|15,000",
    "Misc|Gauntlets of Swimming and Climbing (C, F, T)|1,000|10,000",
    "Misc|Gem of Brightness|2,000|17,500",
    "Misc|Gem of Seeing|2,000|25,000",
    "Misc|Girdle of Femininity/Masculinity (C, F, T)|---|1,000",
    "Misc|Girdle of Giant Strength (C, F, T)|200|2,500",
    "Misc|Helm of Brilliance|2,500|60,000",
    "Misc|Helm of Comprehending Languages & Reading Magic|1,000|12,500",
    "Misc|Helm of Opposite Alignment|---|1,000",
    "Misc|Helm of Telepathy|3,000|35,000",
    "Misc|Helm of Teleportation|2,500|30,000",
    "Misc|Helm of Underwater Action|1,000|10,000",
    "Misc|Horn of Blasting|5,000|55,000",
    "Misc|Horn of Bubbles|---|---",
    "Misc|Horn of Collapsing|1,500|25,000",
    "Misc|Horn of the Tritons (C, F)|2,000|17,500",
    "Misc|Horn of Valhalla|1,000**|15,000**",
    "Misc|Horseshoes of Speed|2,000|10,000",
    "Misc|Horseshoes of a Zephyr|1,500|7,500",
    "Misc|Incense of Meditation (C)|500|7,500",
    "Misc|Incense of Obsession (C)|---|500",
    "Misc|Ioun Stones|300***|5,000***",
    "Misc|Instrument of the Bards|1,000****|5,000****",
    "Misc|Iron Flask|---|---",
    "Misc|Javelin of Lightning (F)|250|3,000",
    "Misc|Javelin of Piercing (F)|250|3,000",
    "Misc|Jewel of Attacks|---|1,000",
    "Misc|Jewel of Flawlessness|---|1,000/facet",
    "Misc|Keoghtom’s Ointment|500|10,000",

    "Misc|Libram of Gainful Conjuration (M)|8,000|40,000",
    "Misc|Libram of Ineffable Damnation (M)|8,000|40,000",
    "Misc|Libram of Silver Magic (M)|8,000|40,000",
    "Misc|Lyre of Building|5,000|30,000",
    "Misc|Manual of Bodily Health|5,000|50,000",
    "Misc|Manual of Gainful Exercise|5,000|50,000",
    "Misc|Manual of Golems (C, M)|3,000|30,000",
    "Misc|Manual of Puissant Skill at Arms (F)|8,000|40,000",
    "Misc|Manual of Quickness of Action|5,000|50,000",
    "Misc|Manual of Stealthy Pilfering (T)|8,000|40,000",
    "Misc|Mattock of the Titans (F)|3,500|7,000",
    "Misc|Maul of the Titans|4,000|12,000",
    "Misc|Medallion of ESP|1,000 / 3,000|10,000 / 30,000",
    "Misc|Medallion of Thought Projection|---|1,000",
    "Misc|Mirror of Life Trapping (M)|2,500|25,000",
    "Misc|Mirror of Mental Prowess|5,000|50,000",
    "Misc|Mirror of Opposition|---|2,000",
    "Misc|Necklace of Adaptation|1,000|10,000",
    "Misc|Necklace of Missiles|50*|200*",
    "Misc|Necklace of Prayer Beads (C)|500**|3,000**",
    "Misc|Necklace of Strangulation|---|1,000",
    "Misc|Net of Entrapment (C, F, T)|1,000|7,500",
    "Misc|Net of Snaring (C, F, T)|1,000|6,000",
    "Misc|Nolzur’s Marvelous Pigments|500***|3,000***",
    "Misc|Pearl of Power (M)|200****|2,000****",
    "Misc|Pearl of Wisdom (C)|500|5,000",
    "Misc|Periapt of Foul Rotting|---|1,000",
    "Misc|Periapt of Health|1,000|10,000",
    "Misc|Periapt of Proof Against Poison|1,500|12,500",
    "Misc|Periapt of Wound Closure|1,000|10,000",
    "Misc|Phylactery of Faithfulness (C)|1,000|7,500",
    "Misc|Phylactery of Long Years (C)|3,000|25,000",
    "Misc|Phylactery of Monstrous Attention (C)|---|2,000",
    "Misc|Pipes of the Sewers|1,750|8,500",
    "Misc|Portable Hole|5,000|50,000",
    "Misc|Quaal’s Feather Token|500 / 1,000|2,000 / 7,000",

    "Misc|Robe of the Archmagi (M)|6,000|65,000",
    "Misc|Robe of Blending|3,500|35,000",
    "Misc|Robe of Eyes (M)|4,500|50,000",
    "Misc|Robe of Powerlessness (M)|---|1,000",
    "Misc|Robe of Scintillating Colors (C, M)|2,750|25,000",
    "Misc|Robe of Useful Items (M)|1,500|15,000",
    "Misc|Rope of Climbing|1,000|10,000",
    "Misc|Rope of Constriction|---|1,000",
    "Misc|Rope of Entanglement|1,250|12,000",
    "Misc|Rug of Smothering|---|1,500",
    "Misc|Rug of Welcome (M)|6,500|45,000",
    "Misc|Saw of Mighty Cutting (F)|1,750|12,500",
    "Misc|Scarab of Death|---|2,500",
    "Misc|Scarab of Enraging Enemies|1,000|8,000",
    "Misc|Scarab of Insanity|1,500|11,000",
    "Misc|Scarab of Protection|2,500|25,000",
    "Misc|Spade of Colossal Excavation (F)|1,000|6,500",
    "Misc|Sphere of Annihilation (M)|3,750|30,000",
    "Misc|Stone of Controlling Earth Elementals|1,500|12,500",
    "Misc|Stone of Good Luck (Luckstone)|3,000|25,000",
    "Misc|Stone of Weight (Loadstone)|---|1,000",
    "Misc|Talisman of Pure Good (C)|3,500|27,500",
    "Misc|Talisman of the Sphere (M)|100|10,000",
    "Misc|Talisman of Ultimate Evil (C)|3,500|32,500",
    "Misc|Talisman of Zagy|1,000|10,000",
    "Misc|Tome of Clear Thought|8,000|48,000",
    "Misc|Tome of Leadership and Influence|7,500|40,000",
    "Misc|Tome of Understanding|8,000|43,500",
    "Misc|Trident of Fish Command (C, F, T)|500|4,000",
    "Misc|Trident of Submission (F)|1,250|12,500",
    "Misc|Trident of Warning (C, F, T)|1,000|10,000",
    "Misc|Trident of Yearning|---|1,000",
    "Misc|Vacuous Grimoire|---|1,000",
    "Misc|Well of Many Worlds|6,000|12,000",
    "Misc|Wings of Flying|750|7,500",

    "Misc|Axe of the Dwarvish Lords|---|55,000",
    "Misc|Baba Yaga’s Hut|---|90,000",
    "Misc|Codex of the Infinite Planes|---|62,500",
    "Misc|Crown of Might|---|50,000",
    "Misc|Crystal of the Ebon Flame|---|75,000",
    "Misc|Cup and Talisman of Al’Akbar|---|85,000",
    "Misc|Eye of Vecna|---|35,000",
    "Misc|Hand of Vecna|---|60,000",
    "Misc|Heward’s Mystical Organ|---|25,000",
    "Misc|Horn of Change|---|20,000",
    "Misc|Invulnerable Coat of Arnd|---|47,500",
    "Misc|Iron Flask of Tuerny the Merciless|---|50,000",
    "Misc|Jacinth of Inestimable Beauty|---|100,000",
    "Misc|Johydee’s Mask|---|40,000",
    "Misc|Kuroth’s Quill|---|27,500",
    "Misc|Mace of Cuthbert|---|35,000",
    "Misc|Machine of Lum the Mad|---|72,500",
    "Misc|Mighty Servant of Leuk-O|---|185,000",
    "Misc|Orb of the Dragonkind|---|10,000–80,000",
    "Misc|Orb of Might|---|100,000",
    "Misc|Queen Ehlissa’s Marvelous Nightingale|---|112,500",
    "Misc|Recorder of Ye’Cind|---|80,000",
    "Misc|Ring of Gaxx|---|17,500",
    "Misc|Rod of Seven Parts|---|25,000",
    "Misc|Sceptre of Might|---|150,000",
    "Misc|Sword of Kas|---|97,000",
    "Misc|Teeth of Dahlver-Nar|---|5,000/tooth",
    "Misc|Throne of the Gods|---|---",
    "Misc|Wand of Orcus|---|10,000",

    "Armor and Shields|Chain Mail +1|600|3,500",
    "Armor and Shields|Chain Mail +2|1,200|7,500",
    "Armor and Shields|Chain Mail +3|2,000|12,500",
    "Armor and Shields|Leather Armor +1|300|2,000",
    "Armor and Shields|Plate Mail +1|800|5,000",
    "Armor and Shields|Plate Mail +2|1,750|10,500",
    "Armor and Shields|Plate Mail +3|2,750|15,500",
    "Armor and Shields|Plate Mail +4|3,500|20,500",
    "Armor and Shields|Plate Mail +5|4,500|27,500",
    "Armor and Shields|Plate Mail of Etherealness|5,000|30,000",
    "Armor and Shields|Plate Mail of Vulnerability|---|1,500",
    "Armor and Shields|Ring Mail +1|400|2,500",
    "Armor and Shields|Scale Mail +1|500|3,000",
    "Armor and Shields|Scale Mail +2|1,100|6,750",
    "Armor and Shields|Splint Mail +1|700|4,000",
    "Armor and Shields|Splint Mail +2|1,500|8,500",
    "Armor and Shields|Splint Mail +3|2,250|14,500",
    "Armor and Shields|Splint Mail +4|3,000|19,000",
    "Armor and Shields|Studded Leather +1|400|2,500",
    "Armor and Shields|Shield +1|250|2,500",
    "Armor and Shields|Shield +2|500|5,000",
    "Armor and Shields|Shield +3|800|8,000",
    "Armor and Shields|Shield +4|1,200|12,000",
    "Armor and Shields|Shield +5|1,750|17,500",
    "Armor and Shields|Shield, large, +1, +4 vs. missiles|400|4,000",
    "Armor and Shields|Shield −1, missile attractor|---|750",

    "Swords|Sword +1|400|2,000",
    "Swords|Sword +1, +2 vs. magic-using & enchanted creatures|600|3,000",
    "Swords|Sword +1, +3 vs. lycanthropes & shape changers|700|3,500",
    "Swords|Sword +1, +3 vs. regenerating creatures|800|4,000",
    "Swords|Sword +1, +4 vs. reptiles|800|4,000",
    "Swords|Sword +1, Flame Tongue|900|4,500",
    "Swords|Sword +1, Luck Blade|1,000|5,000",
    "Swords|Sword +2|800|4,000",
    "Swords|Sword +2, Giant Slayer|900|4,500",
    "Swords|Sword +2, Dragon Slayer|900|4,500",
    "Swords|Sword +2, Nine Lives Stealer|1,600|8,000",
    "Swords|Sword +3|1,400|7,000",
    "Swords|Sword +3, Frost Brand|1,600|8,000",
    "Swords|Sword +4|2,000|10,000",
    "Swords|Sword +4, Defender|3,000|15,000",
    "Swords|Sword +5|3,000|15,000",
    "Swords|Sword +5, Defender|3,600|18,000",
    "Swords|Sword +5, Holy Avenger|4,000|20,000",
    "Swords|Sword of Dancing|4,400|22,000",
    "Swords|Sword of Wounding|4,400|22,000",
    "Swords|Sword of Life Stealing|5,000|25,000",
    "Swords|Sword of Sharpness|7,000|35,000",
    "Swords|Sword, Vorpal Weapon|10,000|50,000",
    "Swords|Sword +1, Cursed|400|---",
    "Swords|Sword −2, Cursed|600|---",
    "Swords|Sword, Cursed Berserking|900|---",

    "Misc Weapons|Arrow +1, 2–24 in number|20|120",
    "Misc Weapons|Arrow +2, 2–16 in number|50|300",
    "Misc Weapons|Arrow +3, 2–12 in number|75|450",
    "Misc Weapons|Arrow of Slaying|250|2,500",
    "Misc Weapons|Axe +1|300|1,750",
    "Misc Weapons|Axe +2|600|3,750",
    "Misc Weapons|Axe +2, Throwing|750|4,500",
    "Misc Weapons|Axe +3|1,000|7,000",
    "Misc Weapons|Battle Axe +1|400|2,500",
    "Misc Weapons|Bolt +2, 2–20 in number|50|300",
    "Misc Weapons|Bow +1|500|3,500",
    "Misc Weapons|Crossbow of Accuracy, +3|2,000|12,000",
    "Misc Weapons|Crossbow of Distance|1,500|7,500",
    "Misc Weapons|Crossbow of Speed|1,500|7,500",
    "Misc Weapons|Dagger +1, +2 vs. creatures smaller than man-sized|100|750",
    "Misc Weapons|Dagger +2, +3 vs. creatures larger than man-sized|250|2,000",
    "Misc Weapons|Dagger of Venom|350|3,000",
    "Misc Weapons|Flail +1|450|4,000",
    "Misc Weapons|Hammer +2|300|2,500",
    "Misc Weapons|Hammer +2|650|6,000",
    "Misc Weapons|Hammer +3, Dwarven Thrower|1,500|15,000",
    "Misc Weapons|Hammer of Thunderbolts|2,500|25,000",
    "Misc Weapons|Javelin +2|750|5,000",
    "Misc Weapons|Mace +1|350|3,000",
    "Misc Weapons|Mace +2|700|4,500",
    "Misc Weapons|Mace of Disruption|1,750|17,500",
    "Misc Weapons|Mace +4|1,500|15,000",
    "Misc Weapons|Military Pick +1|350|2,500",
    "Misc Weapons|Morning Star +1|400|3,000",
    "Misc Weapons|Scimitar +2|750|6,000",
    "Misc Weapons|Sling of Seeking +2|700|7,000",
    "Misc Weapons|Spear +1|500|3,000",
    "Misc Weapons|Spear +2|1,000|6,500",
    "Misc Weapons|Spear +3|1,750|15,000",
    "Misc Weapons|Spear, Cursed Backbiter|---|1,000",
    "Misc Weapons|Trident (Military Fork) +3|1,500|12,500"
  ];

  function parseMagicEntry(category, item, xpText, saleText) {
    var xpNum = parseMaybeNumber(String(xpText).replace(/\*/g, ''));
    var saleNum = parseMaybeNumber(String(saleText).replace(/\*/g, ''));
    return {
      type: category,
      name: item,
      xpText: xpText,
      saleText: saleText,
      xptype: (String(xpText).indexOf('---') !== -1 || String(xpText).trim() === '') ? 'none' :
        (xpNum !== null && String(xpText).indexOf('/') === -1 && String(xpText).indexOf('–') === -1 &&
         String(xpText).indexOf('x') === -1 && String(xpText).indexOf('per') === -1 && String(xpText).indexOf('*') === -1 ? 'fixed' : 'prompt'),
      saletype: (String(saleText).indexOf('---') !== -1 || String(saleText).trim() === '') ? 'none' :
        (saleNum !== null && String(saleText).indexOf('/') === -1 && String(saleText).indexOf('–') === -1 &&
         String(saleText).indexOf('x') === -1 && String(saleText).indexOf('×') === -1 && String(saleText).indexOf('per') === -1 && String(saleText).indexOf('*') === -1 ? 'fixed' : 'prompt'),
      xp: xpNum,
      sale: saleNum
    };
  }

  function buildMagicDb(raw) {
    var out = [];
    var i, parts;
    for (i = 0; i < raw.length; i++) {
      parts = raw[i].split('|');
      if (parts.length >= 4) out.push(parseMagicEntry(parts[0], parts[1], parts[2], parts[3]));
    }
    return out;
  }

  var MAGIC_ITEMS = buildMagicDb(MAGIC_RAW);

  function magicTypes() {
    return ['Potions', 'Scrolls', 'Rings', 'Rods, Staves, and Wands', 'Misc', 'Armor and Shields', 'Swords', 'Misc Weapons'];
  }

  function magicItemsByType(type) {
    var out = [], i;
    for (i = 0; i < MAGIC_ITEMS.length; i++) if (MAGIC_ITEMS[i].type === type) out.push(MAGIC_ITEMS[i]);
    return out;
  }

  function findMagicItem(type, idx) {
    var items = magicItemsByType(type);
    idx = toInt(idx, -1);
    if (idx < 0 || idx >= items.length) return null;
    return items[idx];
  }

  function resolvedXpValue(item, raw) {
    if (item.xptype === 'fixed') return toNum(item.xp, 0);
    if (item.xptype === 'none') return 0;
    return Math.max(0, toNum(raw, 0));
  }

  function resolvedSaleValue(item, raw) {
    if (item.saletype === 'fixed') return toNum(item.sale, 0);
    if (item.saletype === 'none') return 0;
    return Math.max(0, toNum(raw, 0));
  }

  function magicFoundRecord(item, xpVal, saleVal) {
    getRecovered().magicItems.push({
      desc: item.name,
      value: saleVal,
      findxp: xpVal,
      sourceType: item.type
    });
  }

  function renderRecoveredMagicDetails(list) {
    var html = '';
    var i, item;
    if (!list.length) return '';
    html += '<div style="margin-top:4px;"><b>' + span('Magic Items', THEME.magic) + ':</b><br>';
    for (i = 0; i < list.length; i++) {
      item = list[i];
      html += '&bull; ' + span(item.desc, THEME.magic) + ' — ' +
        span('sale ' + (toNum(item.value, 0) > 0 ? Math.floor(item.value) + ' gp' : 'unknown'), THEME.magic) +
        ', ' + span('find XP ' + Math.floor(toNum(item.findxp, 0)), THEME.magic);
      html += ' ' + magicBtn('Edit Sale', '!xp-edit-magic --index|' + i + ' --gp|?{New sale gp|' + Math.floor(toNum(item.value, 0)) + '}');
      html += ' ' + magicBtn('Edit Find XP', '!xp-edit-magic-findxp --index|' + i + ' --xp|?{New find XP|' + Math.floor(toNum(item.findxp, 0)) + '}');
      html += ' ' + magicBtn('Turn in for XP now', '!xp-turnin-magic-found --index|' + i);
      html += ' ' + magicBtn('Sell', '!xp-sell-magic-found --index|' + i + ' --fee|?{Merchant fee % lost|0|5|10|15|20|25|30|35|40|45|50}');
      html += '<br>';
    }
    html += '</div>';
    return html;
  }

  function renderMonsterLog(list) {
    var html = '';
    var i, m;
    if (!list.length) return '';
    html += '<div style="margin-top:4px;"><b>' + span('Monster XP Report', THEME.monster) + ':</b><br>';
    for (i = 0; i < list.length; i++) {
      m = list[i];
      html += '&bull; ' + span(m.name + ' (HD ' + m.hd + ') x' + m.count + ' = ' + m.totalxp + ' XP', THEME.monster) + '<br>';
    }
    html += '</div>';
    return html;
  }

  function renderCoinTurnInLog(list) {
    var html = '';
    var i, e;
    if (!list.length) return '';
    html += '<div style="margin-top:4px;"><b>Coin Turn-In Report:</b><br>';
    for (i = 0; i < list.length; i++) {
      e = list[i];
      html += '&bull; ' + coinSpan(e.label, e.type, e.amount) +
        ' = ' + span(String(Math.floor(e.grossXp)) + ' gross XP', THEME.good) +
        ' - ' + span(String(e.feePct) + '% fee', THEME.warn) +
        ' = ' + span(String(Math.floor(e.xp)) + ' net XP', THEME.good) + '<br>';
    }
    html += '</div>';
    return html;
  }

  function renderMagicSellLog(list) {
    var html = '';
    var i, e;
    if (!list.length) return '';
    html += '<div style="margin-top:4px;"><b>' + span('Magic Item Sale Report', THEME.magic) + ':</b><br>';
    for (i = 0; i < list.length; i++) {
      e = list[i];
      html += '&bull; ' + span(e.name, THEME.magic) +
        ' = ' + span(String(Math.floor(e.grossXp)) + ' gross XP', THEME.good) +
        ' - ' + span(String(e.feePct) + '% merchant fee', THEME.warn) +
        ' = ' + span(String(Math.floor(e.netXp)) + ' net XP', THEME.good) + '<br>';
    }
    html += '</div>';
    return html;
  }

  function showMonsterLetters() {
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var i, html = h4('Monsters by Letter');
    for (i = 0; i < letters.length; i++) {
      html += monsterBtn(letters.charAt(i), '!xp-monsters-letter --letter|' + letters.charAt(i)) + ' ';
      if ((i + 1) % 6 === 0) html += '<br>';
    }
    html += hr() + btn('Back', '!xp-menu');
    send(panel(html));
  }

  function showMonstersForLetter(letter) {
    var monsters = monsterListByLetter(letter);
    var html = h4('Monsters: ' + letter);
    var i, m;

    if (!monsters.length) {
      html += span('No monsters found.', THEME.warn) + '<br>' + btn('Back', '!xp-monsters-alpha');
      return send(panel(html));
    }

    for (i = 0; i < monsters.length; i++) {
      m = monsters[i];
      html += '<div style="margin-bottom:6px;border-top:1px solid ' + THEME.hr + ';padding-top:4px;">';
      html += '<b>' + span(m.name, THEME.monster) + '</b><br>';
      html += span('HD: ' + m.hd, THEME.muted) + '<br>';
      html += monsterBtn(
        'Add Monster XP',
        '!xp-add-monster-manual --name|' + encodeURIComponent(m.name) +
        ' --hd|' + encodeURIComponent(m.hd) +
        ' --xp|?{Manual XP for ' + m.name + '|0}' +
        ' --count|?{How many|1}'
      );
      html += '</div>';
    }

    html += btn('Back to Letters', '!xp-monsters-alpha') + ' ' + btn('Main Menu', '!xp-menu');
    send(panel(html));
  }

  function showMagicTypePicker() {
    var types = magicTypes();
    var html = h4('Add Magic Item');
    var i;
    for (i = 0; i < types.length; i++) {
      html += magicBtn(types[i], '!xp-magic-type --type|' + encodeURIComponent(types[i])) + ' ';
      if ((i + 1) % 2 === 0) html += '<br>';
    }
    html += hr() + magicBtn('Custom Magic Item', '!xp-custom-magic') + ' ' + btn('Back', '!xp-menu');
    send(panel(html));
  }

  function showMagicItemPicker(type) {
    var items = magicItemsByType(type);
    var html, i, item;

    if (!items.length) {
      send(panel(span('No items found for type: ' + type, THEME.warn)));
      return showMagicTypePicker();
    }

    html = h4(type);
    for (i = 0; i < items.length; i++) {
      item = items[i];
      html += '<div style="margin-bottom:6px;border-top:1px solid ' + THEME.hr + ';padding-top:4px;">';
      html += '<b>' + span(item.name, THEME.magic) + '</b><br>';
      html += span('Find XP: ' + item.xpText + ' | Sale gp: ' + item.saleText, THEME.muted) + '<br>';
      html += magicBtn('Use Item', '!xp-magic-use --type|' + encodeURIComponent(type) + ' --idx|' + i);
      html += '</div>';
    }
    html += magicBtn('Back to Types', '!xp-magic-db') + ' ' + btn('Main Menu', '!xp-menu');
    send(panel(html));
  }

  function showMagicUse(item, type, idx) {
    var xpPart, salePart;
    var base = '!xp-magic-add --type|' + encodeURIComponent(type) + ' --idx|' + idx;

    if (item.xptype === 'fixed') xpPart = ' --xp|' + item.xp;
    else if (item.xptype === 'none') xpPart = ' --xp|0';
    else xpPart = ' --xp|?{Find XP (' + item.name + ': ' + item.xpText + ')|0}';

    if (item.saletype === 'fixed') salePart = ' --sale|' + item.sale;
    else if (item.saletype === 'none') salePart = ' --sale|0';
    else salePart = ' --sale|?{Sale gp (' + item.name + ': ' + item.saleText + ')|0}';

    send(panel(
      h4(item.name) +
      magicBtn('Found Only', base + xpPart + salePart + ' --mode|found') + ' ' +
      magicBtn('Turn In for XP Now', base + xpPart + salePart + ' --mode|turnin') + ' ' +
      magicBtn('Sell Now', base + salePart + ' --mode|sell --fee|?{Merchant fee % lost|0|5|10|15|20|25|30|35|40|45|50}') +
      hr() +
      magicBtn('Back', '!xp-magic-type --type|' + encodeURIComponent(type))
    ));
  }

  function menu() {
    checkState();
    var s = getSession();
    var r = getRecovered();
    var html = '';

    html += h3('1e AD&D XP');
    html += line('Party', esc(s.party.join(', ') || '-'));
    html += line('Survivors', esc(s.survivors.join(', ') || '-'));
    html += line('Henchmen', esc(s.henchmen.join(', ') || '-'));
    html += line('Hirelings', esc(s.hirelings.join(', ') || '-'));
    html += line('Monster XP', span(String(Math.floor(s.monsterXP)), THEME.monster));
    html += line('Turned In Coin XP', String(Math.floor(s.turnedInCoinXP)));
    html += line('Turned In Treasure XP', String(Math.floor(s.turnedInTreasureXP)));
    html += line('Turned In Magic Item XP', span(String(Math.floor(s.turnedInMagicXP)), THEME.magic));
    html += line('Potion XP', String(Math.floor(s.potionXP)));
    html += line('Sold Item XP', String(Math.floor(s.soldItemXP)));
    html += line('Total shared XP', span(String(Math.floor(totalSharedXP())), THEME.good));
    html += renderMonsterLog(s.monsterLog);
    html += renderCoinTurnInLog(s.coinTurnInLog);
    html += renderMagicSellLog(s.magicSellLog);
    html += hr();

    html += '<b>Recovered treasure (not counted for XP yet)</b><br>';
    html += coinSpan('Gold', 'gp', r.coins.gp) + ', ';
    html += coinSpan('Silver', 'sp', r.coins.sp) + ', ';
    html += coinSpan('Copper', 'cp', r.coins.cp) + ', ';
    html += coinSpan('Platinum', 'pp', r.coins.pp) + ', ';
    html += coinSpan('Electrum', 'ep', r.coins.ep) + '<br>';
    html += line('Recovered coin gp value', String(Math.floor(recoveredCoinsGpValue())));
    html += line('Recovered gems value', String(Math.floor(recoveredListValue(r.gems))));
    html += line('Recovered jewelry value', String(Math.floor(recoveredListValue(r.jewelry))));
    html += line('Recovered magic item sale value', span(String(Math.floor(recoveredListValue(r.magicItems))), THEME.magic));
    html += renderRecoveredMagicDetails(r.magicItems);
    html += hr();

    html += '<b>1. Participants</b><br>';
    html += btn('Party from Selected', '!xp-party-selected') + ' ';
    html += btn('Survivors from Selected', '!xp-survivors-selected') + ' ';
    html += btn('Henchmen from Selected', '!xp-hench-selected') + ' ';
    html += btn('Hirelings from Selected', '!xp-hirelings-selected') + '<br><br>';

    html += '<b>2. Monsters</b><br>';
    html += monsterBtn('Browse by Alphabet', '!xp-monsters-alpha') + ' ';
    html += monsterBtn('Custom Monster', '!xp-custom-monster') + '<br><br>';

    html += '<b>3. Treasure / items</b><br>';
    html += coinBtn('Recovered Coins', '!xp-recovered-coin --kind|?{Coin|Gold,gp|Silver,sp|Copper,cp|Platinum,pp|Electrum,ep} --amount|?{Amount|0}') + ' ';
    html += coinBtn('Delete Coins', '!xp-delete-coin --kind|?{Coin|Gold,gp|Silver,sp|Copper,cp|Platinum,pp|Electrum,ep} --amount|?{Amount|0}') + ' ';
    html += coinBtn(
      'Turn In Coins',
      '!xp-turnin-coin --kind|?{Coin|Gold,gp|Silver,sp|Copper,cp|Platinum,pp|Electrum,ep}' +
      ' --amount|?{Amount|0}' +
      ' --fee|?{Money changer fee %|0|1|2|3|4|5|6|7|8|9|10}'
    ) + '<br>';
    html += magicBtn('Add Magic Item', '!xp-magic-db') + ' ';
    html += magicBtn('Custom Magic Item', '!xp-custom-magic') + ' ';
    html += btn('Sell Generic Item', '!xp-sell-item --desc|?{Item description|Sold item} --gp|?{Sale gp value|0}') + '<br><br>';

    html += '<b>4. Other awards</b><br>';
    html += btn('Add Manual XP', '!xp-add-manual --xp|?{XP amount|0} --label|?{Label|Objective}') + ' ';
    html += btn('Add Single-Handed', '!xp-add-single --who|?{Character name|} --xp|?{XP amount|0}') + '<br><br>';

    html += '<b>5. Finish</b><br>';
    html += btn('Show Totals', '!xp-show') + ' ';
    html += btn('Award XP', '!xp-award') + ' ';
    html += btn('Reset Session', '!xp-reset') + ' ';
    html += btn('Reset Campaign', '!xp-reset-campaign --confirm|?{Are you sure you want to reset the campaign?|No,no|Yes,yes}');

    send(panel(html));
  }

  function coinTypeLabel(type) {
    if (type === 'gp') return 'Gold';
    if (type === 'sp') return 'Silver';
    if (type === 'cp') return 'Copper';
    if (type === 'ep') return 'Electrum';
    if (type === 'pp') return 'Platinum';
    return type;
  }

  function turnInCoin(type, amount, feePct) {
    var r = getRecovered();
    var s = getSession();
    var actual = Math.min(r.coins[type], amount);
    var grossXp = 0;
    var netXp = 0;

    if (actual <= 0) return { actual: 0, grossXp: 0, netXp: 0, feePct: 0 };

    if (type === 'cp') grossXp = actual / 200;
    else if (type === 'sp') grossXp = actual / 20;
    else if (type === 'ep') grossXp = actual / 2;
    else if (type === 'gp') grossXp = actual;
    else if (type === 'pp') grossXp = actual * 5;

    feePct = Math.max(0, Math.min(10, toNum(feePct, 0)));
    netXp = moneyChangerNet(grossXp, feePct);

    r.coins[type] -= actual;
    s.turnedInCoinXP += netXp;
    s.coinTurnInLog.push({
      type: type,
      label: coinTypeLabel(type),
      amount: actual,
      grossXp: grossXp,
      feePct: feePct,
      xp: netXp
    });

    return { actual: actual, grossXp: grossXp, netXp: netXp, feePct: feePct };
  }

  function handleInput(msg) {
    if (msg.type !== 'api') return;
    if (msg.content.indexOf('!xp') !== 0) return;

    checkState();

    var parsed = parseArgs(msg.content);
    var cmd = parsed.cmd;
    var args = parsed.args;
    var s = getSession();
    var r = getRecovered();

    var xp, label, who, ch, award, i, item, type, idx, saleVal, xpVal, turned, kind, amount, result, feePct, grossXp, netXp;
    var survivors, henchmen, hirelings, sharedXP, shareUnits, oneShare, remainder, survivorBase, henchBase, hireBase, actualAwards, html;
    var name, hd, count, total, category;

    switch (cmd) {
      case '!xp-menu':
      case '!xp-show':
        return menu();

      case '!xp-reset':
        return resetSession();

      case '!xp-reset-campaign':
        if (args.confirm !== 'yes') {
          send(panel(span('Campaign reset canceled.', THEME.warn)));
          return menu();
        }
        return resetCampaign();

      case '!xp-party-selected':
        s.party = selectedCharacterNames(msg);
        s.survivors = s.party.slice(0);
        send(panel(span('Party set from selected.', THEME.good)));
        return menu();

      case '!xp-survivors-selected':
        s.survivors = selectedCharacterNames(msg);
        send(panel(span('Survivors set from selected.', THEME.good)));
        return menu();

      case '!xp-hench-selected':
        s.henchmen = selectedCharacterNames(msg);
        send(panel(span('Henchmen set from selected.', THEME.good)));
        return menu();

      case '!xp-hirelings-selected':
        s.hirelings = selectedCharacterNames(msg);
        send(panel(span('Hirelings set from selected.', THEME.good)));
        return menu();

      case '!xp-monsters-alpha':
        return showMonsterLetters();

      case '!xp-monsters-letter':
        return showMonstersForLetter(args.letter);

      case '!xp-add-monster-manual':
        name = decodeURIComponent(args.name || '');
        hd = decodeURIComponent(args.hd || '');
        xp = Math.max(0, toInt(args.xp, 0));
        count = Math.max(1, toInt(args.count, 1));
        total = xp * count;
        s.monsterXP += total;
        s.monsterLog.push({ name: name, hd: hd, count: count, totalxp: total });
        send(panel(span('Monster XP added: ' + name + ' (HD ' + hd + ') x' + count + ' = ' + total, THEME.monster)));
        return menu();

      case '!xp-custom-monster':
        send(panel(
          h4('Custom Monster') +
          monsterBtn('Add Custom Monster XP',
            '!xp-add-monster-manual --name|?{Monster name|Custom Monster}' +
            ' --hd|?{Hit Dice|Unknown}' +
            ' --xp|?{Manual XP|0}' +
            ' --count|?{How many|1}'
          ) +
          hr() +
          btn('Back', '!xp-menu')
        ));
        return;

      case '!xp-recovered-coin':
        kind = args.kind;
        amount = Math.max(0, toNum(args.amount, 0));
        r.coins[kind] += amount;
        send(panel(span('Recovered coin recorded.', THEME.good)));
        return menu();

      case '!xp-delete-coin':
        kind = args.kind;
        amount = Math.max(0, toNum(args.amount, 0));
        r.coins[kind] = Math.max(0, r.coins[kind] - amount);
        send(panel(span('Recovered coin removed.', THEME.good)));
        return menu();

      case '!xp-turnin-coin':
        kind = args.kind;
        amount = Math.max(0, toNum(args.amount, 0));
        result = turnInCoin(kind, amount, args.fee);
        send(panel(
          span(
            coinTypeLabel(kind) + ' turned in: gross XP ' + Math.floor(result.grossXp) +
            ', fee ' + result.feePct + '%, net XP ' + Math.floor(result.netXp),
            THEME.good
          )
        ));
        return menu();

      case '!xp-magic-db':
        return showMagicTypePicker();

      case '!xp-magic-type':
        type = decodeURIComponent(args.type || '');
        return showMagicItemPicker(type);

      case '!xp-magic-use':
        type = decodeURIComponent(args.type || '');
        idx = toInt(args.idx, -1);
        item = findMagicItem(type, idx);
        if (!item) {
          send(panel(span('Magic item not found.', THEME.bad)));
          return menu();
        }
        return showMagicUse(item, type, idx);

      case '!xp-magic-add':
        type = decodeURIComponent(args.type || '');
        idx = toInt(args.idx, -1);
        item = findMagicItem(type, idx);
        if (!item) {
          send(panel(span('Magic item not found.', THEME.bad)));
          return menu();
        }

        xpVal = resolvedXpValue(item, args.xp);
        saleVal = resolvedSaleValue(item, args.sale);

        if (args.mode === 'found') {
          magicFoundRecord(item, xpVal, saleVal);
          send(panel(span('Recovered magic item recorded: ' + item.name + ' | find XP ' + Math.floor(xpVal) + ' | sale gp ' + Math.floor(saleVal), THEME.magic)));
          return menu();
        }

        if (args.mode === 'turnin') {
          s.turnedInMagicXP += xpVal;
          send(panel(span('Magic item turned in for XP now: ' + item.name + ' = ' + Math.floor(xpVal), THEME.magic)));
          return menu();
        }

        if (args.mode === 'sell') {
          feePct = Math.max(0, Math.min(100, toNum(args.fee, 0)));
          grossXp = saleVal;
          netXp = merchantNet(grossXp, feePct);
          s.soldItemXP += netXp;
          s.magicSellLog.push({
            name: item.name,
            grossXp: grossXp,
            feePct: feePct,
            netXp: netXp
          });
          send(panel(span('Magic item sold now: ' + item.name + ' = ' + Math.floor(grossXp) + ' gross XP - ' + feePct + '% fee = ' + Math.floor(netXp) + ' net XP', THEME.magic)));
          return menu();
        }

        return menu();

      case '!xp-custom-magic':
        send(panel(
          h4('Custom Magic Item') +
          magicBtn('Add Custom Magic Item',
            '!xp-custom-magic-add --type|?{Category|Potions|Scrolls|Rings|Rods, Staves, and Wands|Misc|Armor and Shields|Swords|Misc Weapons}' +
            ' --name|?{Item name|Custom Magic Item}' +
            ' --xp|?{Find XP|0}' +
            ' --sale|?{Sale gp|0}' +
            ' --mode|?{Mode|Found Only,found|Turn In for XP Now,turnin|Sell Now,sell}' +
            ' --fee|?{Merchant fee % lost|0|5|10|15|20|25|30|35|40|45|50}'
          ) +
          hr() +
          btn('Back', '!xp-menu')
        ));
        return;

      case '!xp-custom-magic-add':
        category = args.type || 'Misc';
        name = args.name || 'Custom Magic Item';
        xpVal = Math.max(0, toNum(args.xp, 0));
        saleVal = Math.max(0, toNum(args.sale, 0));

        if (args.mode === 'found') {
          getRecovered().magicItems.push({ desc: name, value: saleVal, findxp: xpVal, sourceType: category });
          send(panel(span('Recovered custom magic item recorded: ' + name + ' | find XP ' + Math.floor(xpVal) + ' | sale gp ' + Math.floor(saleVal), THEME.magic)));
          return menu();
        }

        if (args.mode === 'turnin') {
          s.turnedInMagicXP += xpVal;
          send(panel(span('Custom magic item turned in for XP now: ' + name + ' = ' + Math.floor(xpVal), THEME.magic)));
          return menu();
        }

        if (args.mode === 'sell') {
          feePct = Math.max(0, Math.min(100, toNum(args.fee, 0)));
          grossXp = saleVal;
          netXp = merchantNet(grossXp, feePct);
          s.soldItemXP += netXp;
          s.magicSellLog.push({
            name: name,
            grossXp: grossXp,
            feePct: feePct,
            netXp: netXp
          });
          send(panel(span('Custom magic item sold now: ' + name + ' = ' + Math.floor(grossXp) + ' gross XP - ' + feePct + '% fee = ' + Math.floor(netXp) + ' net XP', THEME.magic)));
          return menu();
        }
        return menu();

      case '!xp-edit-magic':
        i = toInt(args.index, -1);
        if (i < 0 || i >= r.magicItems.length) {
          send(panel(span('Could not edit magic item sale value.', THEME.bad)));
          return menu();
        }
        r.magicItems[i].value = Math.max(0, toNum(args.gp, 0));
        send(panel(span('Magic item sale value updated.', THEME.good)));
        return menu();

      case '!xp-edit-magic-findxp':
        i = toInt(args.index, -1);
        if (i < 0 || i >= r.magicItems.length) {
          send(panel(span('Could not edit magic item find XP.', THEME.bad)));
          return menu();
        }
        r.magicItems[i].findxp = Math.max(0, toNum(args.xp, 0));
        send(panel(span('Magic item find XP updated.', THEME.good)));
        return menu();

      case '!xp-turnin-magic-found':
        i = toInt(args.index, -1);
        if (i < 0 || i >= r.magicItems.length) {
          send(panel(span('No recovered magic item selected.', THEME.bad)));
          return menu();
        }
        turned = r.magicItems.splice(i, 1)[0];
        s.turnedInMagicXP += Math.max(0, toNum(turned.findxp, 0));
        send(panel(span('Recovered magic item turned in: ' + turned.desc + ' = ' + Math.floor(toNum(turned.findxp, 0)) + ' XP', THEME.magic)));
        return menu();

      case '!xp-sell-magic-found':
        i = toInt(args.index, -1);
        if (i < 0 || i >= r.magicItems.length) {
          send(panel(span('No recovered magic item selected.', THEME.bad)));
          return menu();
        }
        turned = r.magicItems.splice(i, 1)[0];
        feePct = Math.max(0, Math.min(100, toNum(args.fee, 0)));
        grossXp = Math.max(0, toNum(turned.value, 0));
        netXp = merchantNet(grossXp, feePct);
        s.soldItemXP += netXp;
        s.magicSellLog.push({
          name: turned.desc,
          grossXp: grossXp,
          feePct: feePct,
          netXp: netXp
        });
        send(panel(span('Recovered magic item sold: ' + turned.desc + ' = ' + Math.floor(grossXp) + ' gross XP - ' + feePct + '% fee = ' + Math.floor(netXp) + ' net XP', THEME.magic)));
        return menu();

      case '!xp-sell-item':
        s.soldItemXP += Math.max(0, toNum(args.gp, 0));
        send(panel(span('Sold item XP added.', THEME.good)));
        return menu();

      case '!xp-add-manual':
        xp = Math.max(0, toInt(args.xp, 0));
        label = args.label || 'Manual award';
        s.manualXP.push({ label: label, xp: xp });
        send(panel(span('Manual XP added: ' + label + ' = ' + xp, THEME.good)));
        return menu();

      case '!xp-add-single':
        who = args.who;
        xp = Math.max(0, toInt(args.xp, 0));
        if (!who) return menu();
        s.singleAwards[who] = toInt(s.singleAwards[who], 0) + xp;
        send(panel(span('Single-handed XP added: ' + who + ' +' + xp, THEME.good)));
        return menu();

      case '!xp-award':
        if (!s.survivors.length) {
          send(panel(span('Error: no survivors set.', THEME.bad)));
          return menu();
        }

        survivors = s.survivors.slice(0);
        henchmen = s.henchmen.slice(0);
        hirelings = s.hirelings.slice(0);
        sharedXP = Math.floor(totalSharedXP());
        shareUnits = (survivors.length * 4) + (henchmen.length * 2) + (hirelings.length * 1);

        if (shareUnits <= 0) {
          send(panel(span('Error: invalid share count.', THEME.bad)));
          return menu();
        }

        oneShare = Math.floor(sharedXP / shareUnits);
        remainder = sharedXP - (oneShare * shareUnits);

        survivorBase = oneShare * 4;
        henchBase = henchmen.length ? (oneShare * 2) : 0;
        hireBase = hirelings.length ? oneShare : 0;

        actualAwards = [];
        for (i = 0; i < survivors.length; i++) actualAwards.push({ name: survivors[i], kind: 'pc', xp: survivorBase });
        for (i = 0; i < henchmen.length; i++) actualAwards.push({ name: henchmen[i], kind: 'henchman', xp: henchBase });
        for (i = 0; i < hirelings.length; i++) actualAwards.push({ name: hirelings[i], kind: 'hireling', xp: hireBase });

        i = 0;
        while (remainder > 0 && actualAwards.length > 0) {
          actualAwards[i % actualAwards.length].xp += 1;
          remainder -= 1;
          i += 1;
        }

        html = h4('XP Award') + line('Total shared XP', span(String(sharedXP), THEME.good)) + hr();

        for (i = 0; i < actualAwards.length; i++) {
          name = actualAwards[i].name;
          award = actualAwards[i].xp + toInt(s.singleAwards[name], 0);
          ch = findCharByName(name);
          if (ch) {
            addToAttr(ch.id, getConfig().xpattr, award);
            html += esc(name) + ': ' + award + ' XP [' + esc(getConfig().xpattr) + ']<br>';
          } else {
            html += esc(name) + ': ' + award + ' XP [character not found]<br>';
          }
        }

        send(panel(html));
        return menu();

      default:
        return menu();
    }
  }

  function register() {
    checkState();
    on('chat:message', handleInput);
    log(SCRIPT + ' v' + VERSION + ' loaded.');
  }

  return { register: register };
}());

on('ready', function () {
  ADND1EXP.register();
});