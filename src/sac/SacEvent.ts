
type Fn<Event extends SacEvent> = (event: Event) => void;

/**
 * SacEvent を継承したクラス を示すタイプ
 */
type SacEventClass<Event extends SacEvent> = {
  readonly _: number;
  new(..._: never): Event;
  createEventSet<Event extends SacEvent>(fn: Fn<Event>): SacEventSet<Event>;
  receive<Event extends SacEvent>(receiver: SacEventReceiver, fn: Fn<Event>): number;
};

// SacEventClass を static で実装する必要がある
abstract class SacEventBase {
  public static readonly _: number;
  public readonly _: number;
  /** 送信したプレイヤーのID */
  public readonly pId?: string;

  public static createEventSet<Event extends SacEventBase>(
    this: SacEventClass<Event>,
    fn: Fn<Event>,
  ): SacEventSet<Event> {
    return { fn, _: this._ };
  }

  public static receive<Event extends SacEvent>(
    this: SacEventClass<Event>,
    receiver: SacEventReceiver,
    fn: Fn<Event>,
  ): number {
    return receiver.addEventSet(this.createEventSet(fn));
  }
}


let nextDefineId = 1;

/**
 * グローバルイベント
 */
export type SacEvent<T = unknown> = Pick<SacEventBase, "_" | "pId"> & T;

/**
 * `SacEvent` を定義する時に呼び出す
 * @example
 * //  extends 時に () を付ける  ↓
 * class MyEvent extends SacEvent() { }
 */
export function SacEvent() {
  const id = nextDefineId++;
  return class SacEvent extends SacEventBase {
    public static readonly _ = id;
    /** イベントを識別するためのID (Sacが内部で利用する値) */
    public readonly _ = id;
  };
}


/**
 * SacEventとイベント名のセット
 */
export interface SacEventSet<Event extends SacEventBase = SacEventBase> {
  /** イベントの種類を識別するID */
  readonly _: number;
  readonly fn: Fn<Event>;
}

/**
 * SacEvent を処理するもの\
 * SacServer/SacClient
 */
export interface SacEventReceiver {
  /**
   * イベントセットを登録する
   * @param eventSet 登録するイベントセット
   * @returns イベントセットを解除するキー
   */
  addEventSet<Event extends SacEventBase>(eventSet: SacEventSet<Event>): number;
  /**
   * イベントセットを解除する
   * @param keys 解除するイベントID配列
   */
  removeEventSets(keys: number[]): void;
}
