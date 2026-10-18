export type PartOfSpeech = "verb" | "adjective" | "noun";

export interface Puzzle {
  number: number;
  date: string; // YYYY-MM-DD
  /** The word to find synonyms for. */
  starter: string;
  pos: PartOfSpeech;
  /** The one sense of the starter the puzzle is about, shown under it. */
  definition: string;
  words: string[];
  /** Alternative spellings and irregular forms -> the answer (or the verb) they stand for. */
  forms: Record<string, string>;
}

export interface ArchiveEntry {
  number: number;
  date: string;
  starter: string;
  definition: string;
  total: number;
}
