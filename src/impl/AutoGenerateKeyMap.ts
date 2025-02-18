
/**
 * キーと値に紐づくマップクラス\
 * キーは追加時に自動生成されます
 */
export class AutoGenerateKeyMap<V> {
  private readonly _map = new Map<number, V>();
  private _nextKey = 1;

  /** マップ内の要素の数 */
  public get size(): number { return this._map.size; }

  /** 全てのペアを削除します */
  public clear(): void {
    this._map.clear();
  }

  /**
   * `key`に紐づく値を削除します
   * @returns マップ内の要素が存在し削除された場合は`true`
   */
  public delete(key: number): boolean {
    return this._map.delete(key);
  }

  /**
   * `callback`をキーと値のペアごとに１回、挿入順に実行します
   */
  public forEach(callback: (value: V, key: number, map: this) => void): void {
    for (const [key, value] of this._map) {
      callback(value, key, this);
    }
  }

  /**
   * `key`に紐づく値を取得します
   * @returns 値または`undefined`
   */
  public get(key: number | undefined): V | undefined {
    return this._map.get(key!);
  }

  /**
   * `key`に紐づく値が存在するか返します
   * @returns 値が存在した場合は`true`
   */
  public has(key: number | undefined): key is number {
    return this._map.has(key!);
  }

  /**
   * キーを自動生成しそれに紐づく値を追加します
   * @returns 生成したキー
   */
  public set(value: V): number {
    const key = this._nextKey++;
    this._map.set(key, value);
    return key;
  }

  public [Symbol.iterator](): IterableIterator<[number, V]> { return this._map[Symbol.iterator](); }
  public entries(): IterableIterator<[number, V]> { return this._map.entries(); }
  public keys(): IterableIterator<number> { return this._map.keys(); }
  public values(): IterableIterator<V> { return this._map.values(); }
}
