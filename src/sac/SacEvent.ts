
type SacEventFn<Event extends SacEvent = SacEvent> = (event: Event) => void;

/** SacEventを実装したクラス を示すタイプ */
type SacEventClass<Event extends SacEvent> = {
  new(..._: never): Event;
  createEventSet<Event extends SacEvent>(fn: SacEventFn<Event>): SacEventSet<Event>;
  receive<Event extends SacEvent>(receiver: SacEventReceiver, fn: SacEventFn<Event>): number;
};

/**
 * グローバルイベント\
 * 全プレイヤーに送受信されるイベントの共通インターフェース
 */
export abstract class SacEvent {
  /** イベント名 (クラス名) @default `this.constructor.name` */
  public readonly eventName = this.constructor.name;

  /** 送信したユーザーのID */
  readonly playerId?: string;

  public static createEventSet<Event extends SacEvent>(
    this: SacEventClass<Event>,
    fn: SacEventFn<Event>,
  ): SacEventSet<Event> {
    return { fn, name: this.name };
  }

  public static receive<Event extends SacEvent>(
    this: SacEventClass<Event>,
    receiver: SacEventReceiver,
    fn: SacEventFn<Event>,
  ): number {
    return receiver.addEventSet(this.createEventSet(fn));
  }
}

/**
 * SacEventとイベント名のセット
 */
export interface SacEventSet<Event extends SacEvent = SacEvent> {
  readonly name: string;
  readonly fn: SacEventFn<Event>;
}

/**
 * SacEvent を処理する
 */
export interface SacEventReceiver {
  /**
   * イベントセットを登録する
   * @param eventSet
   * @returns イベントセットを解除するキー
   */
  addEventSet<Event extends SacEvent>(eventSet: SacEventSet<Event>): number;
  /**
   * イベントセットを解除する
   * @param keys 解除するイベントID配列
   */
  removeEventSets(keys: number[]): void;
}
