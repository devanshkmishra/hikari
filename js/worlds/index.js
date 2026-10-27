// The Hikari Line. Order is the ride order and the emotional arc.
export const LINE = [
  { id: 'station', jp: '夏ヶ原', kana: 'なつがはら', en: 'Natsugahara', no: 'H01',
    palette: ['#9fb59a', '#e9e4cf', '#6f7f74'], scenery: 'rice fields, power lines, overcast summer hills' },
  { id: 'showa', jp: '銀座', kana: 'ぎんざ', en: 'Ginza 1985', no: 'H02',
    palette: ['#1a1030', '#ff6fa8', '#ffcf7a'], scenery: 'neon signage, elevated tracks, warm sodium night' },
  { id: 'aero', jp: '水色ヶ丘', kana: 'みずいろがおか', en: 'Mizuirogaoka', no: 'H03',
    palette: ['#5fc6ff', '#bff07a', '#ffffff'], scenery: 'rolling green hill, glossy sky, bubbles' },
  { id: 'circles', jp: '円町', kana: 'まるまち', en: 'Marumachi', no: 'H04',
    palette: ['#ff66aa', '#22222e', '#ffffff'], scenery: 'black void, pink approach circles' },
  { id: 'rage', jp: '地下', kana: 'ちか', en: 'Chika', no: 'H05',
    palette: ['#0a0a0a', '#ff2a2a', '#d8ff3a'], scenery: 'tunnel, strobes, graffiti, flash' },
  { id: 'zone', jp: '区域', kana: 'くいき', en: 'Kuiki', no: 'H06',
    palette: ['#5a5f48', '#c9c2a3', '#2d2f26'], scenery: 'concrete ruins, birches, wet grass, monoliths' },
  { id: 'coast', jp: '黄昏ヶ浜', kana: 'たそがれがはま', en: 'Tasogaregahama', no: 'H07',
    palette: ['#ff9a5a', '#ffcf9a', '#6a4a7a'], scenery: 'golden sea, long bridge, drowned rooftops' },
];

export const TERMINUS = { id: 'ginga', jp: '銀河', kana: 'ぎんが', en: 'Ginga', no: 'H∞',
  palette: ['#05060f', '#9fb7ff', '#fff3d6'], scenery: 'stars' };

export const loadWorld = (id) => import(`./${id}.js`).then((m) => m.default);
