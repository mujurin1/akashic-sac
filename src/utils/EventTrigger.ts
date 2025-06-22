type Fn<V extends readonly unknown[] = [], R = void> = (...args: V) => R;

/**
 * イベントの追加/削除のみ可能なEventTriggerインターフェース
 * @template V 関数に渡される引数の型
 */
export interface SetOnlyEventTrigger<V extends readonly unknown[] = []> {
  /**
   * イベントハンドラを追加します
   * @param listener イベントの発生時に実行される関数
   * @returns 追加したハンドラの識別キー (削除するときに使用します)
   */
  on(listener: Fn<V>): number;

  /**
   * イベントハンドラを一度だけ実行するように追加します
   * @param listener イベントの発生時に実行される関数
   * @returns 追加したハンドラの識別キー (削除するときに使用します)
   */
  once(listener: Fn<V>): number;

  /**
   * イベントハンドラを削除します
   * @param listener 削除するハンドラの識別キー
   * @returns 削除した場合は`true`
   */
  off(key: number): boolean;
}

/**
 * イベントハンドラの更新・実行を管理するクラス
 * @template V 関数に渡される引数の型
 */
export class EventTrigger<V extends readonly unknown[] = []> implements SetOnlyEventTrigger<V> {
  private keyIndex = 1;
  private readonly _listenerMap = new Map<number, Fn<V>>();

  /**
   * イベントの更新のみ可能な`ISetOnlyEventTrigger`を取得する\
   * (実体はただの`this`)
   */
  public readonly asSetOnly: SetOnlyEventTrigger<V> = this;

  public on(listener: Fn<V>) {
    const key = this.keyIndex++;
    this._listenerMap.set(key, listener);
    return key;
  }

  public once(listener: Fn<V>) {
    const fn = (...args: V) => {
      listener(...args);
      this.off(key);
    };
    const key = this.on(fn);
    return key;
  }

  public off(key: number) {
    return this._listenerMap.delete(key);
  }

  /**
   * イベントを発火します
   * @param args ハンドラに渡される引数
   */
  public fire(...args: V) {
    for (const [, listener] of this._listenerMap) {
      listener(...args);
    }
  }
}
