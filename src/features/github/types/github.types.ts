export interface GitHubCommitAuthor {
  name: string;
  email: string;
  username?: string;
}

export interface GitHubCommit {
  id: string; // Commit SHA
  tree_id?: string;
  distinct?: boolean;
  message: string;
  timestamp: string; // ISO 8601 string
  url: string;
  author: GitHubCommitAuthor;
  committer?: GitHubCommitAuthor;
  added?: string[];
  removed?: string[];
  modified?: string[];
}

export interface GitHubRepository {
  id: number;
  node_id?: string;
  name: string;
  full_name: string;
  private?: boolean;
  html_url: string;
  description?: string | null;
  fork?: boolean;
  url?: string;
  default_branch?: string;
}

export interface GitHubPusher {
  name: string;
  email?: string;
}

export interface GitHubPushEventPayload {
  ref: string; // e.g. "refs/heads/feat/issue-40-github-branch-input"
  before?: string;
  after?: string;
  repository: GitHubRepository;
  pusher?: GitHubPusher;
  sender?: {
    login: string;
    id: number;
    avatar_url?: string;
  };
  created?: boolean;
  deleted?: boolean;
  forced?: boolean;
  base_ref?: string | null;
  compare?: string;
  commits: GitHubCommit[];
  head_commit?: GitHubCommit | null;
}

export interface GitHubPingEventPayload {
  zen: string;
  hook_id: number;
  hook?: {
    type: string;
    id: number;
    name: string;
    active: boolean;
    events: string[];
    config: {
      content_type: string;
      url: string;
      insecure_ssl: string;
    };
  };
  repository?: GitHubRepository;
  sender?: {
    login: string;
    id: number;
  };
}

export interface WebhookProcessResult {
  success: boolean;
  event: string;
  message: string;
  branch?: string;
  matchedTasksCount?: number;
  insertedCommitsCount?: number;
  details?: Record<string, unknown>;
}

export interface TaskGithubCommit {
  id: string;
  task_id: string;
  commit_sha: string;
  commit_message: string | null;
  author_username: string | null;
  committed_at: string | null;
  url: string | null;
}
