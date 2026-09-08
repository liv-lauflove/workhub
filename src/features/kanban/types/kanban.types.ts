import type { Database } from '@/types/database.types';

export type BoardColumn = Database['public']['Tables']['board_columns']['Row'];
export type BoardColumnInsert =
  Database['public']['Tables']['board_columns']['Insert'];
