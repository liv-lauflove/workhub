/**
 * Schema Dictionary Knowledge Base for Workhub AI RAG (Issue #97).
 * Provides a sanitized, safe representation of PostgreSQL tables, columns,
 * and foreign-key relationships.
 *
 * Guarantees zero direct raw table access by LLM: the model receives this curated
 * schema dictionary to answer data model and schema-related questions safely.
 */

export interface TableColumnDoc {
  name: string;
  type: string;
  isNullable: boolean;
  description: string;
}

export interface TableDoc {
  tableName: string;
  description: string;
  primaryKey: string;
  foreignKeys: Array<{ column: string; references: string }>;
  columns: TableColumnDoc[];
}

export const WORKHUB_SCHEMA_DICTIONARY: TableDoc[] = [
  {
    tableName: 'projects',
    description:
      'Stores software projects belonging to specific teams with Kanban boards and milestones.',
    primaryKey: 'id (uuid)',
    foreignKeys: [
      { column: 'team_id', references: 'teams(id)' },
      { column: 'owner_id', references: 'profiles(id)' },
    ],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Primary key of the project',
      },
      {
        name: 'name',
        type: 'text',
        isNullable: false,
        description: 'Name of the project',
      },
      {
        name: 'description',
        type: 'text',
        isNullable: true,
        description: 'Detailed project description',
      },
      {
        name: 'team_id',
        type: 'uuid',
        isNullable: true,
        description: 'Team assigned to this project',
      },
      {
        name: 'owner_id',
        type: 'uuid',
        isNullable: false,
        description: 'User who created/leads the project',
      },
      {
        name: 'github_repo',
        type: 'text',
        isNullable: true,
        description: 'Connected GitHub repository (owner/repo)',
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        isNullable: false,
        description: 'Record creation timestamp',
      },
    ],
  },
  {
    tableName: 'tasks',
    description:
      'Core work units tracked across Kanban status columns with assignees, priorities, and branch links.',
    primaryKey: 'id (uuid)',
    foreignKeys: [
      { column: 'project_id', references: 'projects(id)' },
      { column: 'column_id', references: 'task_columns(id)' },
      { column: 'assignee_id', references: 'profiles(id)' },
      { column: 'created_by', references: 'profiles(id)' },
    ],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Primary key of the task',
      },
      {
        name: 'title',
        type: 'text',
        isNullable: false,
        description: 'Title or summary of the task',
      },
      {
        name: 'description',
        type: 'text',
        isNullable: true,
        description: 'Full description and acceptance criteria',
      },
      {
        name: 'priority',
        type: 'text',
        isNullable: false,
        description: 'Priority level: critical, high, medium, low',
      },
      {
        name: 'origin',
        type: 'text',
        isNullable: false,
        description: 'Origin source: normal or cs_complaint',
      },
      {
        name: 'origin_note',
        type: 'text',
        isNullable: true,
        description: 'Customer support ticket details if cs_complaint',
      },
      {
        name: 'due_date',
        type: 'date',
        isNullable: true,
        description: 'Deadline date (YYYY-MM-DD)',
      },
      {
        name: 'assignee_id',
        type: 'uuid',
        isNullable: true,
        description: 'Profile ID of the developer responsible (PIC)',
      },
      {
        name: 'column_id',
        type: 'uuid',
        isNullable: false,
        description: 'Current status column ID on the Kanban board',
      },
      {
        name: 'project_id',
        type: 'uuid',
        isNullable: false,
        description: 'Project to which this task belongs',
      },
      {
        name: 'github_branch',
        type: 'text',
        isNullable: true,
        description: 'Linked Git branch name (e.g. feat/issue-46)',
      },
      {
        name: 'created_by',
        type: 'uuid',
        isNullable: false,
        description: 'Author/Creator profile ID',
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        isNullable: false,
        description: 'Timestamp when task was created',
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        isNullable: false,
        description: 'Timestamp of last modification',
      },
    ],
  },
  {
    tableName: 'task_columns',
    description:
      'Kanban board columns representing workflow stages for tasks in a project.',
    primaryKey: 'id (uuid)',
    foreignKeys: [{ column: 'project_id', references: 'projects(id)' }],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Primary key of the Kanban column',
      },
      {
        name: 'project_id',
        type: 'uuid',
        isNullable: false,
        description: 'Project owning this column',
      },
      {
        name: 'name',
        type: 'text',
        isNullable: false,
        description:
          'Column status name (e.g. Backlog, In Progress, Testing, Done)',
      },
      {
        name: 'order_index',
        type: 'integer',
        isNullable: false,
        description: 'Display ordering from left to right',
      },
    ],
  },
  {
    tableName: 'profiles',
    description:
      'User accounts, team memberships, engineering job positions, and capacity points.',
    primaryKey: 'id (uuid)',
    foreignKeys: [{ column: 'team_id', references: 'teams(id)' }],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Matches Supabase auth.users ID',
      },
      {
        name: 'full_name',
        type: 'text',
        isNullable: true,
        description: 'Full display name of the user',
      },
      {
        name: 'role',
        type: 'text',
        isNullable: false,
        description: 'Permission role: leader, member, or management',
      },
      {
        name: 'team_id',
        type: 'uuid',
        isNullable: true,
        description: 'Team ID to which the member belongs',
      },
      {
        name: 'job_position',
        type: 'text',
        isNullable: true,
        description:
          'Job position: Frontend Developer, Backend Developer, QA Engineer, etc.',
      },
      {
        name: 'capacity_points',
        type: 'numeric',
        isNullable: true,
        description: 'Individual capacity points baseline',
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        isNullable: false,
        description: 'Account creation timestamp',
      },
    ],
  },
  {
    tableName: 'teams',
    description: 'Engineering and operational teams collaborating on projects.',
    primaryKey: 'id (uuid)',
    foreignKeys: [],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Primary key of the team',
      },
      {
        name: 'name',
        type: 'text',
        isNullable: false,
        description: 'Team name (e.g. Tim Alpha, Backend Services)',
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        isNullable: false,
        description: 'Team creation timestamp',
      },
    ],
  },
  {
    tableName: 'capacity_settings',
    description:
      'Per-team capacity configurations and baseline thresholds for overload detection.',
    primaryKey: 'id (uuid)',
    foreignKeys: [{ column: 'team_id', references: 'teams(id)' }],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Primary key of setting record',
      },
      {
        name: 'team_id',
        type: 'uuid',
        isNullable: false,
        description: 'Target team',
      },
      {
        name: 'default_capacity',
        type: 'numeric',
        isNullable: false,
        description: 'Standard points quota per sprint',
      },
      {
        name: 'max_points_threshold',
        type: 'numeric',
        isNullable: false,
        description: 'Overload limit above which warning triggers',
      },
    ],
  },
  {
    tableName: 'ai_suggestion_overrides',
    description:
      'Audit log recording instances where human leaders intentionally override AI suggested priorities or durations.',
    primaryKey: 'id (uuid)',
    foreignKeys: [
      { column: 'task_id', references: 'tasks(id)' },
      { column: 'overridden_by', references: 'profiles(id)' },
    ],
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isNullable: false,
        description: 'Primary key of override log',
      },
      {
        name: 'task_id',
        type: 'uuid',
        isNullable: false,
        description: 'Task modified',
      },
      {
        name: 'suggested_priority',
        type: 'text',
        isNullable: true,
        description: 'Priority level recommended by AI',
      },
      {
        name: 'suggested_duration_hours',
        type: 'numeric',
        isNullable: true,
        description: 'AI estimated duration in hours',
      },
      {
        name: 'final_priority',
        type: 'text',
        isNullable: true,
        description: 'Human choice selected by leader',
      },
      {
        name: 'overridden_by',
        type: 'uuid',
        isNullable: true,
        description: 'Profile ID of the leader',
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        isNullable: false,
        description: 'Timestamp of override action',
      },
    ],
  },
];

/**
 * Formats the entire schema dictionary into a concise markdown documentation string.
 */
export function getSchemaDictionaryString(): string {
  const sections = WORKHUB_SCHEMA_DICTIONARY.map((table) => {
    const colList = table.columns
      .map(
        (c) =>
          `  - \`${c.name}\` (${c.type}${c.isNullable ? ', optional' : ''}): ${c.description}`
      )
      .join('\n');
    const fkList = table.foreignKeys.length
      ? `\n  *Foreign Keys:* ${table.foreignKeys
          .map((fk) => `\`${fk.column}\` -> \`${fk.references}\``)
          .join(', ')}`
      : '';

    return `### Tabel: \`${table.tableName}\`\n**Deskripsi:** ${table.description}\n**Primary Key:** \`${table.primaryKey}\`${fkList}\n**Kolom:**\n${colList}`;
  });

  return `## Kamus Schema Database Workhub (Schema-Only RAG Knowledge Base)\n\n${sections.join(
    '\n\n'
  )}`;
}

/**
 * Searches and returns only relevant schema table documentation based on user query keywords.
 */
export function searchSchemaDictionary(query: string): string {
  const lower = query.toLowerCase();
  const matched = WORKHUB_SCHEMA_DICTIONARY.filter((table) => {
    const matchesTable =
      table.tableName.toLowerCase().includes(lower) ||
      lower.includes(table.tableName.toLowerCase());
    const matchesDesc = table.description.toLowerCase().includes(lower);
    const matchesCol = table.columns.some((c) =>
      lower.includes(c.name.toLowerCase())
    );
    return matchesTable || matchesDesc || matchesCol;
  });

  if (matched.length === 0) {
    // Return high-level summary if no specific table keyword matched
    return getSchemaDictionaryString();
  }

  const sections = matched.map((table) => {
    const colList = table.columns
      .map((c) => `  - \`${c.name}\` (${c.type}): ${c.description}`)
      .join('\n');
    return `### Tabel: \`${table.tableName}\`\n${table.description}\n**Kolom Utama:**\n${colList}`;
  });

  return `## Potongan Schema Relevan (Workhub RAG):\n\n${sections.join('\n\n')}`;
}
