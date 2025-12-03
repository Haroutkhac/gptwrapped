interface ChatExport {
  conversations: Conversation[];
}

type UUID = string;

interface Conversation {
  title: string;
  create_time: number;       // e.g. Unix timestamp (float / seconds-since-epoch)
  update_time: number;       // same format
  mapping: { [nodeId: UUID]: MappingNode };
  moderation_results: any[]; // often empty array
  current_node: UUID;
  plugin_ids: string[] | null;
  conversation_id: string;
  conversation_template_id: string | null;
  gizmo_id: string | null;
  gizmo_type: string | null;
  is_archived: boolean;
  is_starred?: boolean | null;
  safe_urls: string[];
  blocked_urls: string[];
  default_model_slug: string;
  conversation_origin?: string | null;
  is_read_only?: boolean | null;
  voice?: string | null;
  async_status?: string | null;
  disabled_tool_ids?: string[];
  is_do_not_remember?: boolean;
  memory_scope?: string;
  context_scopes?: any;
  sugar_item_id?: string | null;
  sugar_item_visible?: boolean;
  is_study_mode?: boolean;
  owner?: string | null;
  id: string;                // likely same as conversation_id but included
}

interface MappingNode {
  id: UUID;
  message: Message | null;
  parent: UUID | null;
  children: UUID[];
}

interface Message {
  id: UUID;
  author: {
    role: "user" | "assistant" | "system";
    name: string | null;
    metadata: { [key: string]: any };
  };
  create_time: number | null;
  update_time: number | null;
  content: MessageContent;
  status: string;   // e.g. "finished_successfully"
  end_turn: boolean | null;
  weight: number;
  metadata: { [key: string]: any };
  recipient: string | null;
  channel: string | null;
}

interface MessageContent {
  content_type: string;       // e.g. "text", maybe others
  parts?: string[];           // for “text”, list of text parts (strings)
  // If other content types — additional fields may appear (e.g. attachments, files)
  [key: string]: any;
}