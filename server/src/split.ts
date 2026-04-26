import { Reader, splitFile, writeFile } from 'ach-ts';
import type { SplitOptions, SplitConditions, ValidateOpts } from 'ach-ts';

export type SplitMode = 'conditions' | 'companyId' | 'companyName' | 'secCode';

export interface SplitParams {
  content: string;
  mode: SplitMode;
  conditions?: SplitConditions;
}

export interface SplitResult {
  files?: Record<string, string[]>;
  error?: string;
}

export function splitAchContent(params: SplitParams): SplitResult {
  try {
    const reader = new Reader(params.content);
    reader.setValidation({ skipAll: true } as ValidateOpts);
    const { file } = reader.readWithErrors();
    if (!file) return { error: 'Could not parse the ACH file.' };

    const options: SplitOptions = {};

    if (params.conditions) {
      options.conditions = params.conditions;
    }

    switch (params.mode) {
      case 'companyId':
        options.groupBatch = (bh) => bh.companyIdentification.trim();
        break;
      case 'companyName':
        options.groupBatch = (bh) => bh.companyName.trim();
        break;
      case 'secCode':
        options.groupBatch = (bh) => bh.standardEntryClassCode.trim();
        break;
    }

    const [groups, err] = splitFile(file, options);
    if (err) return { error: String(err) };
    if (!groups || groups.size === 0) return { error: 'Split produced no output files.' };

    const files: Record<string, string[]> = {};
    for (const [key, fileList] of groups) {
      files[key] = fileList.map(f => writeFile(f));
    }
    return { files };
  } catch (e) {
    return { error: String(e) };
  }
}
