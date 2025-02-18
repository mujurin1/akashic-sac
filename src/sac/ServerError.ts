import { SacEvent } from "./SacEvent";

export const ServerErrorFrom = {
  /** `sacInitialize`で渡された`initialized` */
  initialize: "initialize",
  /** `sacInitialize`で渡された`serverStart` */
  start: "start",
  /** `SacEvent`経由で実行された関数 */
  evented: "evented",
  /**
   * `SacEvent`経由で実行された関数\
   * (サーバーと同一の端末でクライアント実行されている場合のみ発行されます)
   */
  client_evented: "client_evented",
} as const;
export type ServerErrorFrom = keyof typeof ServerErrorFrom;

/**
 * サーバーでエラーが発生したエラーをクライアントへ通知するイベント
 */
export class ServerError extends SacEvent {
  constructor(
    /** エラーの発生箇所 */
    readonly from: ServerErrorFrom,
    /** `catch`されたオブジェクト */
    readonly error: unknown,
  ) {
    super();
  }
}
