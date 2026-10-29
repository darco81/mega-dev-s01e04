// Plan morning-digest § 1. The contract every part of § 2 builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Times keep the offset from the log (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as —
  runs: number; // lines for this job
  retries: number; // lines with status retry
  lastStatus: RunStatus;
  lastError: string | null; // the latest error seen for this job, even if it later went ok
  first: string;
  last: string;
};

export type Night = {
  night: string;
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
};

// null when runs/<night>.jsonl does not exist.
export type ReadNight = (runsDir: string, night: string) => Night | null;
