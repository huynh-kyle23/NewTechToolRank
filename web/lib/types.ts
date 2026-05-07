export type ToolRecord = {
  tool_id: string;
  tool_name: string;
  source: string;
  description: string | null;
  url: string | null;
  score: number;
  momentum_label: 'hot' | 'rising' | 'new';
  data_practice_category: string | null;
  tool_domain: 'data_tool' | 'non_data_tool';
  data_pulled_at: string;
  data_pulled_date: string;
  created_at: string | null;
};

export type ToolFilters = {
  dataOnly: boolean;
  sources: string[];
  categories: string[];
  momenta: string[];
  lookbackDays: number;
  limit: number;
};
