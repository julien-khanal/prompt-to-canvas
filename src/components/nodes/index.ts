import { PromptNode } from "./PromptNode";
import { ImageGenNode } from "./ImageGenNode";
import { ImageRefNode } from "./ImageRefNode";
import { OutputNode } from "./OutputNode";
import { CompareNode } from "./CompareNode";

export const nodeTypes = {
  prompt: PromptNode,
  imageGen: ImageGenNode,
  imageRef: ImageRefNode,
  output: OutputNode,
  compare: CompareNode,
};
