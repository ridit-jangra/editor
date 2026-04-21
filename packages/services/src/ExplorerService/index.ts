import { EventEmitter } from "../emitter";
import { FileSystemService } from "../FileSystemService";
import { Service } from "../service";
import { VirtualTree } from "../../../ui/src/index";
import { IFolderStructure } from "../../../ui/src/components/VirtualTree/types";

export type ExplorerOptions = {
  fileSystem: FileSystemService;
  rootPath: string;
  onFileOpen: (path: string) => void;
};

export class ExplorerService extends Service {
  private fileSystem: FileSystemService;
  private rootPath: string;
  private onFileOpen: (path: string) => void;
  structure: IFolderStructure | null = null;

  constructor(
    private eventEmitter: EventEmitter,
    { fileSystem, onFileOpen, rootPath }: ExplorerOptions,
  ) {
    super("ExplorerService");

    ((this.fileSystem = fileSystem),
      (this.rootPath = rootPath),
      (this.onFileOpen = onFileOpen));
  }

  async render(document: any) {
    this.structure =
      (await this.fileSystem.getRootStructure(this.rootPath)) ??
      ({ structure: [], path: "", root: { name: "" } } as IFolderStructure);

    const onFileOpen = this.onFileOpen;

    const tree = VirtualTree(
      {
        folderStructure: this.structure!,
        rowHeight: 28,
        onSelect(id, node) {
          if (node.type === "file") {
            onFileOpen(node.path);
          }
        },
      },
      this.fileSystem,
    );

    return tree;
  }
}
