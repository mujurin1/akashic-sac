
export class AutoGenerateKeyMap<V> {
  private readonly _map = new Map<number, V>();
  private _nextKey = 1;

  /**
   * マップ内の要素の数
   */
  public get size(): number { return this._map.size; }


  public clear(): void {
    this._map.clear();
  }

  /**
   * @returns マップ内の要素が存在し、削除された場合は true、要素が存在しない場合は false
   */
  public delete(key: number): boolean {
    return this._map.delete(key);
  }

  /**
   * 提供された関数をマップ内のキーと値のペアごとに 1 回、挿入順に実行します
   */
  public forEach(callbackfn: (value: V, key: number, map: this) => void, thisArg?: any): void {
    for (const [key, value] of this._map) {
      callbackfn.bind(thisArg)(value, key, this);
    }
  }

  /**
   * 指定された要素を返します
   * @returns 指定されたキーに関連付けられた要素を返します。指定されたキーに関連付けられている要素がない場合は、unknown が返されます
   */
  public get(key: number | undefined): V | undefined {
    return this._map.get(key!);
  }

  /**
   * @returns 指定されたキーを持つ要素が存在するかどうかを示すブール値
   */
  public has(key: number | undefined): key is number {
    return this._map.has(key!);
  }

  /**
   * 指定されたキーと値を持つ新しい要素をマップに追加します\
   * 同じキーを持つ要素がすでに存在する場合、その要素は更新されます
   * @returns 生成したキー
   */
  public set(value: V): number {
    const key = this._nextKey++;
    this._map.set(key, value);
    return key;
  }

  /** 
   * マップ内のエントリの反復可能値を返します
   */
  public [Symbol.iterator](): IterableIterator<[number, V]> {
    return this._map[Symbol.iterator]();
  }

  /**
   * マップ内のすべてのエントリのキーと値のペアの反復可能値を返します
   */
  public entries(): IterableIterator<[number, V]> {
    return this._map.entries();
  }

  /**
   * マップ内のキーの反復可能値を返します
   */
  public keys(): IterableIterator<number> {
    return this._map.keys();
  }

  /**
   * マップ内の値の反復可能値を返します
   */
  public values(): IterableIterator<V> {
    return this._map.values();
  }
}

// import { ReadonlyCollection } from "./ReadonlyCollection";

// /**
//  * 一意のキーと値をセットで持っているコレクション\
//  * インデックスはキーの追加された順序\
//  * キーの配列, 値の配列, キーから値の取得が可能
//  */
// export class AutoKeyCollection<V> implements ReadonlyCollection<number, V> {
//   keys: number[] = [];
//   values: Record<number, V> = {};

//   private _nextKeyValue = 1;

//   public get length() {
//     return this.keys.length;
//   }

//   get(key?: number) {
//     return this.values[key!];
//   }

//   hasKey(key?: number): key is number {
//     return this.values[key!] != null;
//   }


//   /**
//    * 新しい要素を追加する
//    * @param value 値
//    * @returns 登録した値を削除するためのキー
//    */
//   add(value: V) {
//     const key = this._nextKeyValue++;

//     this.keys.push(key);
//     this.values[key] = value;

//     return key;
//   }

//   /**
//    * そのキーの値を削除します
//    * @param key
//    * @returns
//    */
//   remove(key?: number): boolean {
//     const index = this.keys.indexOf(key!);
//     if (index === -1) return false;

//     this.keys.splice(index, 1);
//     delete this.values[key!];


//     return true;
//   }

//   /**
//    * 全てのキーと値を削除します
//    */
//   clear(): void {
//     this.keys = [];
//     this.values = {};
//   }

//   asReadonly(): ReadonlyCollection<number, V> {
//     return this;
//   }

//   *[Symbol.iterator](): IterableIterator<[number, V]> {
//     for (const key of this.keys) {
//       yield [key, this.values[key]];
//     }
//   }

//   clone(): AutoKeyCollection<V> {
//     const collection = new AutoKeyCollection<V>();

//     collection.keys = [...this.keys];
//     collection.values = { ...this.values };
//     collection._nextKeyValue = this._nextKeyValue;

//     return collection;
//   }
// }
