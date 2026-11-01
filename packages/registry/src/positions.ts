export interface Position {
  /** 1-based */
  line: number;
  /** 1-based, in UTF-16 code units */
  column: number;
}

/** Converts string offsets to line and column. */
export class LineIndex {
  private readonly starts: number[] = [0];

  constructor(text: string) {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) this.starts.push(i + 1);
    }
  }

  positionAt(offset: number): Position {
    let low = 0;
    let high = this.starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((this.starts[mid] as number) <= offset) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: offset - (this.starts[low] as number) + 1 };
  }
}
