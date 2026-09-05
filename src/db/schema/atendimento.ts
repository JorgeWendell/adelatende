import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

function orgId() {
  return text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });
}

export const waQueue = pgTable(
  "wa_queue",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#57adf8"),
    greeting: text("greeting"),
    distribution: text("distribution").notNull().default("manual"),
    maxLoad: integer("max_load").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("wa_queue_organizationId_idx").on(table.organizationId)]
);

export const waQueueMember = pgTable(
  "wa_queue_member",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    queueId: text("queue_id")
      .notNull()
      .references(() => waQueue.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wa_queue_member_queue_user_uidx").on(table.queueId, table.userId),
    index("wa_queue_member_organizationId_idx").on(table.organizationId),
  ]
);

export const waConnection = pgTable(
  "wa_connection",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    name: text("name").notNull(),
    evolutionInstance: text("evolution_instance").notNull(),
    status: text("status").notNull().default("close"),
    phone: text("phone"),
    qrCode: text("qr_code"),
    defaultQueueId: text("default_queue_id").references(() => waQueue.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wa_connection_instance_uidx").on(table.evolutionInstance),
    index("wa_connection_organizationId_idx").on(table.organizationId),
  ]
);

export const waContact = pgTable(
  "wa_contact",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    jid: text("jid").notNull(),
    avatarUrl: text("avatar_url"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wa_contact_org_jid_uidx").on(table.organizationId, table.jid),
    index("wa_contact_organizationId_idx").on(table.organizationId),
  ]
);

export const waConversation = pgTable(
  "wa_conversation",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => waConnection.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => waContact.id, { onDelete: "cascade" }),
    queueId: text("queue_id").references(() => waQueue.id, {
      onDelete: "set null",
    }),
    assignedUserId: text("assigned_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("waiting"),
    isGroup: boolean("is_group").notNull().default(false),
    unreadCount: integer("unread_count").notNull().default(0),
    lastMessageAt: timestamp("last_message_at"),
    lastMessagePreview: text("last_message_preview"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wa_conversation_conn_contact_uidx").on(
      table.connectionId,
      table.contactId
    ),
    index("wa_conversation_organizationId_idx").on(table.organizationId),
    index("wa_conversation_status_idx").on(table.organizationId, table.status),
  ]
);

export const waMessage = pgTable(
  "wa_message",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => waConversation.id, { onDelete: "cascade" }),
    waId: text("wa_id"),
    direction: text("direction").notNull(),
    type: text("type").notNull().default("text"),
    body: text("body"),
    mediaUrl: text("media_url"),
    mediaMime: text("media_mime"),
    fromMe: boolean("from_me").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("wa_message_conversationId_idx").on(table.conversationId),
    uniqueIndex("wa_message_org_waId_uidx").on(table.organizationId, table.waId),
  ]
);

export const waQuickReply = pgTable(
  "wa_quick_reply",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    shortcut: text("shortcut").notNull(),
    body: text("body").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wa_quick_reply_org_shortcut_uidx").on(
      table.organizationId,
      table.shortcut
    ),
    index("wa_quick_reply_organizationId_idx").on(table.organizationId),
  ]
);
