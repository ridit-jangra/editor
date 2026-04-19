export class Service {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public start(...args: any) {}
  public stop(...args: any) {}
}
