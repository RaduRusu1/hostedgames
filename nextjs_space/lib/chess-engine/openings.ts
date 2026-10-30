export type Opening = { eco: string; name: string; moves: string };

// Curated opening book (SAN, space separated). Longer lines are more specific variations.
export const OPENINGS: Opening[] = [
  { eco: 'B00', name: "King's Pawn Opening", moves: 'e4' },
  { eco: 'A40', name: "Queen's Pawn Opening", moves: 'd4' },
  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'A02', name: "Bird's Opening", moves: 'f4' },
  { eco: 'A00', name: "Larsen's Opening", moves: 'b3' },
  { eco: 'A00', name: 'Grob Opening', moves: 'g4' },
  { eco: 'A00', name: 'King’s Fianchetto Opening', moves: 'g3' },
  { eco: 'A00', name: 'Van ’t Kruijs Opening', moves: 'e3' },
  { eco: 'A00', name: 'Polish Opening', moves: 'b4' },

  // 1.e4 e5
  { eco: 'C20', name: "King's Pawn Game", moves: 'e4 e5' },
  { eco: 'C40', name: "King's Knight Opening", moves: 'e4 e5 Nf3' },
  { eco: 'C44', name: "King's Knight Opening: Normal Variation", moves: 'e4 e5 Nf3 Nc6' },
  { eco: 'C60', name: 'Ruy Lopez (Spanish Opening)', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { eco: 'C68', name: 'Ruy Lopez: Exchange Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { eco: 'C70', name: 'Ruy Lopez: Morphy Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4' },
  { eco: 'C78', name: 'Ruy Lopez: Morphy Defense, Main Line', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O' },
  { eco: 'C84', name: 'Ruy Lopez: Closed Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7' },
  { eco: 'C50', name: 'Italian Game', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { eco: 'C50', name: 'Italian Game: Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5' },
  { eco: 'C54', name: 'Italian Game: Giuoco Piano, Main Line', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3' },
  { eco: 'C51', name: 'Italian Game: Evans Gambit', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4' },
  { eco: 'C55', name: 'Italian Game: Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6' },
  { eco: 'C57', name: 'Two Knights Defense: Fried Liver Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7' },
  { eco: 'C50', name: 'Hungarian Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Be7' },
  { eco: 'C45', name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4' },
  { eco: 'C45', name: 'Scotch Game: Main Line', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4' },
  { eco: 'C44', name: 'Scotch Gambit', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4' },
  { eco: 'C46', name: 'Three Knights Opening', moves: 'e4 e5 Nf3 Nc6 Nc3' },
  { eco: 'C47', name: 'Four Knights Game', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6' },
  { eco: 'C44', name: 'Ponziani Opening', moves: 'e4 e5 Nf3 Nc6 c3' },
  { eco: 'C42', name: 'Petrov’s Defense', moves: 'e4 e5 Nf3 Nf6' },
  { eco: 'C41', name: 'Philidor Defense', moves: 'e4 e5 Nf3 d6' },
  { eco: 'C40', name: 'Latvian Gambit', moves: 'e4 e5 Nf3 f5' },
  { eco: 'C40', name: 'Elephant Gambit', moves: 'e4 e5 Nf3 d5' },
  { eco: 'C30', name: "King's Gambit", moves: 'e4 e5 f4' },
  { eco: 'C33', name: "King's Gambit Accepted", moves: 'e4 e5 f4 exf4' },
  { eco: 'C30', name: "King's Gambit Declined", moves: 'e4 e5 f4 Bc5' },
  { eco: 'C31', name: 'Falkbeer Countergambit', moves: 'e4 e5 f4 d5' },
  { eco: 'C25', name: 'Vienna Game', moves: 'e4 e5 Nc3' },
  { eco: 'C29', name: 'Vienna Gambit', moves: 'e4 e5 Nc3 Nf6 f4' },
  { eco: 'C23', name: "Bishop's Opening", moves: 'e4 e5 Bc4' },
  { eco: 'C21', name: 'Center Game', moves: 'e4 e5 d4 exd4 Qxd4' },
  { eco: 'C21', name: 'Danish Gambit', moves: 'e4 e5 d4 exd4 c3' },
  { eco: 'C20', name: 'Wayward Queen Attack', moves: 'e4 e5 Qh5' },

  // Sicilian
  { eco: 'B20', name: 'Sicilian Defense', moves: 'e4 c5' },
  { eco: 'B27', name: 'Sicilian Defense: Open', moves: 'e4 c5 Nf3' },
  { eco: 'B50', name: 'Sicilian Defense: Modern Variations', moves: 'e4 c5 Nf3 d6' },
  { eco: 'B54', name: 'Sicilian Defense: Open, Main Line', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { eco: 'B80', name: 'Sicilian Defense: Scheveningen Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6' },
  { eco: 'B56', name: 'Sicilian Defense: Classical Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6' },
  { eco: 'B30', name: 'Sicilian Defense: Old Sicilian', moves: 'e4 c5 Nf3 Nc6' },
  { eco: 'B33', name: 'Sicilian Defense: Sveshnikov Variation', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5' },
  { eco: 'B31', name: 'Sicilian Defense: Rossolimo Variation', moves: 'e4 c5 Nf3 Nc6 Bb5' },
  { eco: 'B40', name: 'Sicilian Defense: French Variation', moves: 'e4 c5 Nf3 e6' },
  { eco: 'B44', name: 'Sicilian Defense: Taimanov Variation', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6' },
  { eco: 'B41', name: 'Sicilian Defense: Kan Variation', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6' },
  { eco: 'B23', name: 'Sicilian Defense: Closed', moves: 'e4 c5 Nc3' },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', moves: 'e4 c5 c3' },
  { eco: 'B21', name: 'Sicilian Defense: Smith-Morra Gambit', moves: 'e4 c5 d4 cxd4 c3' },
  { eco: 'B21', name: 'Sicilian Defense: Grand Prix Attack', moves: 'e4 c5 Nc3 Nc6 f4' },

  // Other 1.e4 defenses
  { eco: 'C00', name: 'French Defense', moves: 'e4 e6' },
  { eco: 'C01', name: 'French Defense: Exchange Variation', moves: 'e4 e6 d4 d5 exd5' },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: 'e4 e6 d4 d5 e5' },
  { eco: 'C03', name: 'French Defense: Tarrasch Variation', moves: 'e4 e6 d4 d5 Nd2' },
  { eco: 'C10', name: 'French Defense: Paulsen Variation', moves: 'e4 e6 d4 d5 Nc3' },
  { eco: 'C15', name: 'French Defense: Winawer Variation', moves: 'e4 e6 d4 d5 Nc3 Bb4' },
  { eco: 'C11', name: 'French Defense: Classical Variation', moves: 'e4 e6 d4 d5 Nc3 Nf6' },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: 'e4 c6' },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: 'e4 c6 d4 d5 e5' },
  { eco: 'B13', name: 'Caro-Kann Defense: Exchange Variation', moves: 'e4 c6 d4 d5 exd5 cxd5' },
  { eco: 'B15', name: 'Caro-Kann Defense: Main Line', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4' },
  { eco: 'B18', name: 'Caro-Kann Defense: Classical Variation', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5' },
  { eco: 'B01', name: 'Scandinavian Defense', moves: 'e4 d5' },
  { eco: 'B01', name: 'Scandinavian Defense: Main Line', moves: 'e4 d5 exd5 Qxd5 Nc3' },
  { eco: 'B01', name: 'Scandinavian Defense: Modern Variation', moves: 'e4 d5 exd5 Nf6' },
  { eco: 'B07', name: 'Pirc Defense', moves: 'e4 d6 d4 Nf6 Nc3 g6' },
  { eco: 'B06', name: 'Modern Defense', moves: 'e4 g6' },
  { eco: 'B02', name: "Alekhine's Defense", moves: 'e4 Nf6' },
  { eco: 'B00', name: 'Nimzowitsch Defense', moves: 'e4 Nc6' },
  { eco: 'B00', name: 'Owen Defense', moves: 'e4 b6' },

  // 1.d4
  { eco: 'D00', name: "Queen's Pawn Game", moves: 'd4 d5' },
  { eco: 'D06', name: "Queen's Gambit", moves: 'd4 d5 c4' },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4' },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: 'd4 d5 c4 e6' },
  { eco: 'D35', name: "Queen's Gambit Declined: Exchange Variation", moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5' },
  { eco: 'D37', name: "Queen's Gambit Declined: Three Knights Variation", moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3' },
  { eco: 'D53', name: "Queen's Gambit Declined: Orthodox Defense", moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5' },
  { eco: 'D32', name: 'Tarrasch Defense', moves: 'd4 d5 c4 e6 Nc3 c5' },
  { eco: 'D10', name: 'Slav Defense', moves: 'd4 d5 c4 c6' },
  { eco: 'D43', name: 'Semi-Slav Defense', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6' },
  { eco: 'D08', name: 'Albin Countergambit', moves: 'd4 d5 c4 e5' },
  { eco: 'D07', name: 'Chigorin Defense', moves: 'd4 d5 c4 Nc6' },
  { eco: 'D02', name: 'London System', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { eco: 'D00', name: 'London System', moves: 'd4 d5 Bf4' },
  { eco: 'A45', name: 'London System', moves: 'd4 Nf6 Bf4' },
  { eco: 'D00', name: 'Blackmar-Diemer Gambit', moves: 'd4 d5 e4' },
  { eco: 'D03', name: 'Torre Attack', moves: 'd4 Nf6 Nf3 e6 Bg5' },
  { eco: 'D05', name: 'Colle System', moves: 'd4 d5 Nf3 Nf6 e3' },
  { eco: 'A45', name: 'Indian Defense', moves: 'd4 Nf6' },
  { eco: 'A45', name: 'Trompowsky Attack', moves: 'd4 Nf6 Bg5' },
  { eco: 'A50', name: 'Indian Defense: Normal Variation', moves: 'd4 Nf6 c4' },
  { eco: 'E60', name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6' },
  { eco: 'E70', name: "King's Indian Defense: Normal Variation", moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4' },
  { eco: 'E90', name: "King's Indian Defense: Classical Variation", moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3' },
  { eco: 'E80', name: "King's Indian Defense: Sämisch Variation", moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3' },
  { eco: 'D80', name: 'Grünfeld Defense', moves: 'd4 Nf6 c4 g6 Nc3 d5' },
  { eco: 'D85', name: 'Grünfeld Defense: Exchange Variation', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { eco: 'E12', name: "Queen's Indian Defense", moves: 'd4 Nf6 c4 e6 Nf3 b6' },
  { eco: 'E11', name: 'Bogo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+' },
  { eco: 'E00', name: 'Catalan Opening', moves: 'd4 Nf6 c4 e6 g3' },
  { eco: 'A57', name: 'Benko Gambit', moves: 'd4 Nf6 c4 c5 d5 b5' },
  { eco: 'A60', name: 'Modern Benoni', moves: 'd4 Nf6 c4 c5 d5 e6' },
  { eco: 'A56', name: 'Benoni Defense', moves: 'd4 Nf6 c4 c5' },
  { eco: 'A51', name: 'Budapest Gambit', moves: 'd4 Nf6 c4 e5' },
  { eco: 'A80', name: 'Dutch Defense', moves: 'd4 f5' },
  { eco: 'A87', name: 'Dutch Defense: Leningrad Variation', moves: 'd4 f5 c4 Nf6 g3 g6' },
  { eco: 'A84', name: 'Dutch Defense: Stonewall Variation', moves: 'd4 f5 c4 Nf6 g3 e6 Bg2 d5' },
  { eco: 'A40', name: 'Englund Gambit', moves: 'd4 e5' },

  // Flank
  { eco: 'A20', name: 'English Opening: Reversed Sicilian', moves: 'c4 e5' },
  { eco: 'A30', name: 'English Opening: Symmetrical Variation', moves: 'c4 c5' },
  { eco: 'A15', name: 'English Opening: Anglo-Indian Defense', moves: 'c4 Nf6' },
  { eco: 'A05', name: 'Réti Opening: King’s Indian Attack', moves: 'Nf3 Nf6 g3' },
  { eco: 'A09', name: 'Réti Gambit', moves: 'Nf3 d5 c4' },
];

const BOOK = OPENINGS.map((o) => ({ ...o, list: o.moves.split(' ') }));

/** Longest opening whose full move list matches the start of `sans`. */
export function detectOpening(sans: string[]): Opening | null {
  let best: (typeof BOOK)[number] | null = null;
  for (const o of BOOK) {
    if (o.list.length > sans.length) continue;
    if (o.list.every((m, i) => m === sans[i]) && (!best || o.list.length > best.list.length)) best = o;
  }
  return best ? { eco: best.eco, name: best.name, moves: best.moves } : null;
}

/** Opening whose move list exactly equals `sans` (i.e. the move just played completes it). */
export function openingCompletedBy(sans: string[]): Opening | null {
  const key = sans.join(' ');
  const hit = BOOK.filter((o) => o.moves === key);
  return hit.length ? hit[hit.length - 1] : null;
}

/** True when `sans` is still inside known theory (a prefix of some book line). */
export function isBookPosition(sans: string[]): boolean {
  return BOOK.some((o) => o.list.length >= sans.length && sans.every((m, i) => o.list[i] === m));
}
