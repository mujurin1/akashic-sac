
type CLASS<C> = { new(): C; };

/**
 * `new Class()`で呼び出せるクラスを取り出します
 *
 * `get(Class)`がその`Class`で初めての場合にインスタンスを生成して返します\
 * 以降は同じインスタンスを返します
 */
export class DIContainer {
  private readonly instances = new Map<CLASS<unknown>, unknown>();

  /**
   * `Class`インスタンスを取得します
   * @param Class 取得するインスタンスのクラス
   * @returns `Class`インスタンス
   */
  get<C>(Class: CLASS<C>): C {
    let obj = this.instances.get(Class) as C;
    if (obj == null) {
      obj = new Class();
      this.instances.set(Class, obj);
    }
    return obj;
  }

  /**
   * `Class`インスタンスを再生成します
   * @param Class 再生するインスタンスのクラス
   * @returns `Class`インスタンス
   */
  refresh<C>(Class: CLASS<C>): C {
    const obj = new Class();
    this.instances.set(Class, obj);
    return obj;
  }
}
