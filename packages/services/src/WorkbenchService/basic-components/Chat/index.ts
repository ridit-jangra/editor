import type { ComponentClasses } from "../../components";
import type { AIService } from "../../../../../ai/src/AIService";

export class ChatComponent {
  private document: Document | null = null;
  private messagesEl: HTMLElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private sendBtn: HTMLElement | null = null;
  private isLoading = false;
  private messages: { role: "user" | "assistant"; text: string }[] = [];

  constructor(
    private classes: ComponentClasses,
    private aiService: AIService,
  ) {}

  render(document: Document): HTMLElement {
    this.document = document;

    const root = document.createElement("div");
    root.style.cssText =
      "display:flex; flex-direction:column; height:100%; overflow:hidden;";

    const messages = document.createElement("div");
    messages.style.cssText =
      "flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px;";
    this.messagesEl = messages;

    const inputArea = document.createElement("div");
    inputArea.style.cssText =
      "display:flex; gap:8px; padding:8px; border-top:1px solid var(--border);";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Ask anything...";
    textarea.rows = 2;
    textarea.style.cssText =
      "flex:1; resize:none; padding:8px; background:var(--input-background); color:var(--foreground); border:1px solid var(--border); border-radius:4px; font-size:inherit; font-family:inherit; outline:none;";
    this.inputEl = textarea;

    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.style.cssText =
      "padding:8px 14px; background:var(--button-background); color:var(--button-foreground); border:none; border-radius:4px; cursor:pointer; font-size:inherit; align-self:flex-end;";
    this.sendBtn = sendBtn;

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });

    sendBtn.addEventListener("click", () => this.submit());

    inputArea.appendChild(textarea);
    inputArea.appendChild(sendBtn);

    root.appendChild(messages);
    root.appendChild(inputArea);

    return root;
  }

  private async submit() {
    if (!this.inputEl || this.isLoading) return;

    const prompt = this.inputEl.value.trim();
    if (!prompt) return;

    this.inputEl.value = "";
    this.addMessage("user", prompt);
    this.setLoading(true);

    try {
      const result = await this.aiService.chat({ prompt, withMemory: true });
      this.addMessage("assistant", result.text);
    } catch (err) {
      this.addMessage("assistant", `Error: ${String(err)}`);
    } finally {
      this.setLoading(false);
    }
  }

  private addMessage(role: "user" | "assistant", text: string) {
    if (!this.messagesEl || !this.document) return;

    this.messages.push({ role, text });

    const bubble = this.document.createElement("div");
    bubble.style.cssText = `
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 8px;
      word-break: break-word;
      white-space: pre-wrap;
      align-self: ${role === "user" ? "flex-end" : "flex-start"};
      background: ${role === "user" ? "var(--button-background)" : "var(--editor-background)"};
      color: var(--foreground);
      border: 1px solid var(--border);
      font-size: 0.95em;
    `;
    bubble.textContent = text;

    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
    if (this.sendBtn) {
      this.sendBtn.textContent = loading ? "..." : "Send";
      (this.sendBtn as HTMLButtonElement).disabled = loading;
      this.sendBtn.style.opacity = loading ? "0.6" : "1";
    }
    if (this.inputEl) {
      this.inputEl.disabled = loading;
    }
  }
}
