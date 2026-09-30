const groups = require('./public/factions.json');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const names = Object.values(groups).flat().filter(name=>name!=='Custom');
const alternateNames = {
  'Space Marines': ['Space Marines (Astartes)', 'Adeptus Astartes'],
  'Agents of the Imperium': ['Imperial Agents'],
  'Genestealer Cults': ['Genestealer Cult'],
  "T'au Empire": ['Tau', 'Tau Empire', 'T’au Empire'],
  'Aeldari': ['Eldar', 'Craftworld Eldar', 'Asuryani'],
  'Chaos Daemons': ['Chaos Demons', 'Daemons of Chaos']
};
const lookup = new Map();
for (const name of names) for (const alias of [name,...(alternateNames[name] || [])]) {
  const id=normalize(alias);
  if (lookup.has(id) && lookup.get(id)!==name) throw new Error('Alias de facción ambiguo: '+alias);
  lookup.set(id,name);
}
const canonicalFaction = value => lookup.get(normalize(value)) || null;
const factionKey = value => {const name=canonicalFaction(value);return name ? normalize(name) : null;};
module.exports={names,groups,alternateNames,canonicalFaction,factionKey};
