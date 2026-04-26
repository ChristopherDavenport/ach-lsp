import { describe, it, expect } from 'vitest';
import { mergeAchContents } from '../merge';
import { VALID_ACH, MULTI_BATCH_ACH, MALFORMED_ACH, PARTIAL_ACH } from './testFixtures';

describe('mergeAchContents', () => {
  it('merges two valid ACH files into one', () => {
    const result = mergeAchContents([VALID_ACH, VALID_ACH]);
    expect(result.error).toBeUndefined();
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBe(1);
    // Output should be valid ACH text starting with file header
    expect(result.files![0].startsWith('101')).toBe(true);
  });

  it('merged output contains entries from both files', () => {
    const result = mergeAchContents([VALID_ACH, VALID_ACH]);
    const output = result.files![0];
    const entryLines = output.split('\n').filter(l => l.startsWith('6'));
    // Each input has 1 entry, merged should have 2
    expect(entryLines.length).toBe(2);
  });

  it('merges a multi-batch file with a single-batch file', () => {
    const result = mergeAchContents([MULTI_BATCH_ACH, VALID_ACH]);
    expect(result.error).toBeUndefined();
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBeGreaterThanOrEqual(1);
    const output = result.files![0];
    const entryLines = output.split('\n').filter(l => l.startsWith('6'));
    expect(entryLines.length).toBeGreaterThanOrEqual(2);
  });

  it('produces valid 94-character lines in output', () => {
    const result = mergeAchContents([VALID_ACH, VALID_ACH]);
    const lines = result.files![0].split('\n').filter(l => l.length > 0);
    for (const line of lines) {
      expect(line.length).toBe(94);
    }
  });

  it('preserves file header origin and destination', () => {
    const result = mergeAchContents([VALID_ACH, VALID_ACH]);
    const output = result.files![0];
    const headerLine = output.split('\n')[0];
    // immediateDestination at cols 3-13, immediateOrigin at cols 13-23
    expect(headerLine.substring(3, 13).trim()).toBe('076401251');
    expect(headerLine.substring(13, 23).trim()).toBe('076401251');
  });

  it('returns error for empty contents array', () => {
    const result = mergeAchContents([]);
    expect(result.error).toBeDefined();
  });

  it('returns error when no files can be parsed', () => {
    const result = mergeAchContents(['not ach content', 'also not ach']);
    expect(result.error).toBeDefined();
  });

  it('filters out unparseable files and merges the rest', () => {
    const result = mergeAchContents([VALID_ACH, 'garbage', VALID_ACH]);
    expect(result.error).toBeUndefined();
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBeGreaterThanOrEqual(1);
  });

  it('handles partial/malformed files gracefully', () => {
    const result = mergeAchContents([PARTIAL_ACH, MALFORMED_ACH]);
    // Should either produce an error or handle gracefully, not throw
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('merges three files', () => {
    const result = mergeAchContents([VALID_ACH, VALID_ACH, VALID_ACH]);
    expect(result.error).toBeUndefined();
    expect(result.files).toBeDefined();
    const output = result.files![0];
    const entryLines = output.split('\n').filter(l => l.startsWith('6'));
    expect(entryLines.length).toBe(3);
  });

  it('output has exactly one file header and one file control', () => {
    const result = mergeAchContents([VALID_ACH, MULTI_BATCH_ACH]);
    const output = result.files![0];
    const lines = output.split('\n');
    const fileHeaders = lines.filter(l => l.startsWith('1'));
    const fileControls = lines.filter(l => l.startsWith('9') && !l.startsWith('99'));
    expect(fileHeaders.length).toBe(1);
    expect(fileControls.length).toBe(1);
  });
});
