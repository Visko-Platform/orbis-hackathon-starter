import {
  integer,
  text,
  sqliteTable,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
export const stories = sqliteTable(
  "stories",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    title: text("title").notNull(),
    templateId: text("template_id").notNull(),
    genre: text("genre").notNull(),
    state: text("state").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_stories_owner_updated").on(t.owner, t.updatedAt)],
);
export const votes = sqliteTable(
  "votes",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    pollId: text("poll_id").notNull(),
    voter: text("voter").notNull(),
    choiceId: text("choice_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.pollId, t.voter] })],
);
export const viewers = sqliteTable(
  "viewers",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    voter: text("voter").notNull(),
    seenAt: integer("seen_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.storyId, t.voter] }),
    index("idx_viewers_story_seen").on(t.storyId, t.seenAt),
  ],
);
export const usage = sqliteTable(
  "usage",
  {
    owner: text("owner").notNull(),
    bucket: text("bucket").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.owner, t.bucket] })],
);
