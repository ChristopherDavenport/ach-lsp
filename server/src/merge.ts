import { Reader, mergeFiles, writeFile } from 'ach-ts';

export interface MergeResult {
  files?: string[];
  error?: string;
}

export function mergeAchContents(contents: string[]): MergeResult {
  try {
    const parsed = contents.map(text => {
      const reader = new Reader(text);
      const { file } = reader.readWithErrors();
      return file;
    }).filter(f => f !== null && f !== undefined);
    if (parsed.length === 0) return { error: 'No files could be parsed.' };
    const [merged, err] = mergeFiles(parsed);
    if (err) return { error: String(err) };
    if (!merged || merged.length === 0) return { error: 'Merge produced no output files.' };
    return { files: merged.map(f => writeFile(f)) };
  } catch (e) {
    return { error: String(e) };
  }
}
