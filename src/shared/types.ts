export interface Sense {
  label: string;
  words: string[];
}

export interface Puzzle {
  number: number;
  date: string; // YYYY-MM-DD
  verb: string;
  senses: Sense[];
  /** Alternative spellings and irregular forms -> the answer (or the verb) they stand for. */
  forms: Record<string, string>;
}

export interface ArchiveEntry {
  number: number;
  date: string;
  verb: string;
  total: number;
}
