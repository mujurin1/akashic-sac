type Listener<A extends readonly unknown[] = [], R = void> = (...arg: A) => R;

/**
 * イベントの更新が可能なEventTriggerインターフェース
 * @template V 関数に渡される引数の型
 */
export interface ISetOnlyEventTrigger<V extends readonly unknown[] = []> {
  /**
   * リスナーを追加します
   * @param listener 追加するリスナー
   * @returns リスナーの識別キー (削除するときに使用します)
   */
  on(listener: Listener<V>): number;

  /**
   * リスナーを一度だけ実行するように追加します
   * @param listener 追加するリスナー
   * @returns リスナーの識別キー (削除するときに使用します)
   */
  onOff(listener: Listener<V>): number;

  /**
   * リスナーを削除します
   * @param listener 削除するリスナーの識別キー
   * @returns 削除した場合は`true`
   */
  off(key: number): boolean;
}

/**
 * イベントの更新・実行が可能なEventTriggerインターフェース
 * @template V 関数に渡される引数の型
 */
export interface IEventTrigger<V extends readonly unknown[] = []> {
  /**
   * イベントを発火します
   * @param argsトリスナーを呼び出す引数
   */
  fire(...args: V): void;
}

/**
 * イベントハンドラの更新・実行を管理するクラス
 * @template V 関数に渡される引数の型
 */
export class EventTrigger<V extends readonly unknown[] = []> implements IEventTrigger<V> {
  private keyIndex = 1;
  private readonly _listenerMap = new Map<number, Listener<V>>();

  /**
   * イベントの更新のみ可能なIEventListenerRegistryを取得する
   * (実体は`this`)
   */
  public readonly asSetOnly: ISetOnlyEventTrigger<V> = this;

  public on(listener: Listener<V>) {
    const key = this.keyIndex++;
    this._listenerMap.set(key, listener);
    return key;
  }

  public onOff(listener: Listener<V>) {
    const fn = (...args: V) => {
      listener(...args);
      this.off(key);
    };
    this.on(fn);
    const key = this.on(fn);
    return key;
  }

  public off(key: number) {
    return this._listenerMap.delete(key);
  }

  public fire(...args: V) {
    for (const [, listener] of this._listenerMap) {
      listener(...args);
    }
  }
}
