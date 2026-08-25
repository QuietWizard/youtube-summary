export type Video = {
  id: number;
  created_at: string;
  videoId: string | null;
  title: string | null;
  thumbnail: string | null;
  videoChannelId: string | null;
  videoChannelTitle: string | null;
  summary: string | null;
  read: boolean | null;
  archived: boolean | null;
  videoPublished: string | null;
  category: string | null;
  updated_at: string;
  field_updated_at: Partial<Record<'read' | 'archived' | 'category', string>>;
}
