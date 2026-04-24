import { EventEmitter } from "../emitter";
import { FileSystemService } from "../FileSystemService";
import { Service } from "../service";
import { VirtualTree } from "../../../ui/src/index";
import { IFolderStructure } from "../../../ui/src/components/VirtualTree/types";

export type ExplorerRequiredServices = {
  fileSystem: FileSystemService;
};

export type ExplorerOptions = {
  services: ExplorerRequiredServices;
  rootPath: string;
};

export class ExplorerService extends Service {
  private fileSystem: FileSystemService;
  private rootPath: string;
  structure: IFolderStructure | null = null;

  constructor(
    private eventEmitter: EventEmitter,
    { services, rootPath }: ExplorerOptions,
  ) {
    super("ExplorerService");

    const { fileSystem } = services;

    this.fileSystem = fileSystem;
    this.rootPath = rootPath;
  }

  async render(document: any) {
    this.structure =
      (await this.fileSystem.getRootStructure(this.rootPath)) ??
      ({ structure: [], path: "", root: { name: "" } } as IFolderStructure);

    const tree = VirtualTree(
      {
        folderStructure: this.structure!,
        rowHeight: 28,
        onSelect: (id, node) => {
          if (node.type === "file") {
            this.eventEmitter.emit("editor:openFile", node.path);
          }
        },
      },
      this.fileSystem,
    );

    return tree;
  }
}
