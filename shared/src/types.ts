export interface TreeNode {
  label: string;
  detail?: string;
  line: number;
  children?: TreeNode[];
  type: 'fileHeader' | 'batch' | 'batchHeader' | 'entry' | 'addenda' | 'batchControl' | 'fileControl';
}

export interface LineBoundaries {
  line: number;
  boundaries: number[];
}
