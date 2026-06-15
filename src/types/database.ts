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
}
