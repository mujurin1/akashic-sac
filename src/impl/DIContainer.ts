
type CLASS<C> = { new(): C; };

export class DIContainer {
  private readonly instances = new Map<CLASS<unknown>, unknown>();

  get<C>(cls: CLASS<C>): C {
    let obj = this.instances.get(cls) as C;
    if (obj == null) {
      obj = new cls();
      this.instances.set(cls, obj);
    }
    return obj;
  }
}
