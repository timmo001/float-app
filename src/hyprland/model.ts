import { Schema } from "effect";

export const HyprlandClient = Schema.Struct({
  address: Schema.String,
  stableId: Schema.optional(Schema.String),
  mapped: Schema.Boolean,
  hidden: Schema.Boolean,
  at: Schema.Tuple([Schema.Number, Schema.Number]),
  size: Schema.Tuple([Schema.Number, Schema.Number]),
  class: Schema.String,
  initialClass: Schema.String,
  title: Schema.String,
  initialTitle: Schema.String,
  pid: Schema.Number,
  xwayland: Schema.Boolean,
  focused: Schema.optional(Schema.Boolean),
});
export interface HyprlandClient extends Schema.Schema.Type<
  typeof HyprlandClient
> {}

export const HyprlandClients = Schema.Array(HyprlandClient);

export const FloatingRule = Schema.Struct({
  class: Schema.String,
  field: Schema.Literals(["class", "initial_class"]),
});
export interface FloatingRule extends Schema.Schema.Type<typeof FloatingRule> {}

export const Registry = Schema.Struct({
  version: Schema.Literal(1),
  config: Schema.optional(Schema.String),
  rules: Schema.Array(FloatingRule),
});
export interface Registry extends Schema.Schema.Type<typeof Registry> {}
